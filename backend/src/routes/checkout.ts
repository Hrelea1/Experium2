import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/auth';
import { query, queryOne } from '../db';
import { sendBookingConfirmation, sendProviderBookingNotification } from '../services/email';
import { sendSms, getBookingConfirmedSms } from '../services/sms';
import { createProviderNotification } from '../services/providerNotifications';

const router = Router();
const stripeToken = process.env.STRIPE_SECRET_KEY || 'sk_test_51O...';
const stripe = new Stripe(stripeToken, { apiVersion: '2023-10-16' as any });

router.post('/create-session', requireAuth, async (req: Request, res: Response) => {
  try {
    const { items, success_url, cancel_url } = req.body;
    
    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    const line_items = items.map((item: any) => ({
      price_data: {
        currency: 'ron',
        product_data: {
          name: item.title || 'Experiență',
        },
        unit_amount: Math.round(item.totalPrice * 100), // convert lei to bani
      },
      quantity: 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: success_url + "?session_id={CHECKOUT_SESSION_ID}",
      cancel_url,
      metadata: {
        userId: req.user!.userId,
        itemsMetadata: JSON.stringify(items.map((i: any) => ({
          experienceId: i.experienceId,
          slotDate: i.slotDate,
          startTime: i.startTime,
          participants: i.participants,
          totalPrice: i.totalPrice,
          participantDetails: i.participantDetails
        }))),
      },
    });

    res.json({ id: session.id, url: session.url });
  } catch (err: any) {
    console.error('Stripe Checkout Error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/verify-session', requireAuth, async (req: Request, res: Response) => {
  try {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ error: 'No session_id provided' });

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Payment not successful' });
    }

    const metadata = session.metadata;
    if (!metadata || !metadata.itemsMetadata || !metadata.userId) {
      return res.status(400).json({ error: 'Invalid session metadata' });
    }

    const items = JSON.parse(metadata.itemsMetadata);
    const userId = metadata.userId;

    let successCount = 0;
    for (const item of items) {
      const bookingDate = `${item.slotDate}T${item.startTime}`;

      // ── 48-hour advance booking enforcement ─────────────────
      const hoursUntil = (new Date(bookingDate).getTime() - Date.now()) / 3_600_000;
      if (hoursUntil < 48) {
        console.warn(`[checkout] Slot rejected (< 48h): ${bookingDate}`);
        continue; // skip this item — slot too close
      }
      
      const booking = await queryOne<{ id: string }>(
        `INSERT INTO bookings
          (user_id, experience_id, booking_date, participants, participant_details, total_price, payment_method, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [userId, item.experienceId, bookingDate, item.participants, JSON.stringify(item.participantDetails), item.totalPrice, 'card', 'confirmed']
      );

      if (booking) {
        successCount++;
        // Trigger notifications in background (separated so client email always sends)
        (async () => {
          try {
            const dateStr = new Date(bookingDate).toLocaleString('ro-RO');

            // 1. Get client info (always available)
            const clientInfo = await queryOne<{ email: string; full_name: string; phone: string | null; title: string }>(
              `SELECT u.email, p.full_name, p.phone, e.title
               FROM users u
               LEFT JOIN profiles p ON p.id = u.id
               JOIN experiences e ON e.id = $2
               WHERE u.id = $1`,
              [userId, item.experienceId]
            );

            if (clientInfo) {
              // Client Email — always send
              await sendBookingConfirmation({
                email: clientInfo.email,
                name: clientInfo.full_name ?? 'Client',
                experienceTitle: clientInfo.title,
                bookingDate: dateStr,
                participants: Number(item.participants),
                totalPrice: Number(item.totalPrice),
                bookingId: booking.id,
              }).catch(err => console.error('[checkout] Client email error:', err));

              // Client SMS
              if (clientInfo.phone) {
                const smsBody = getBookingConfirmedSms({
                  title: clientInfo.title,
                  date: dateStr,
                  participants: Number(item.participants),
                  bookingId: booking.id
                });
                await sendSms(clientInfo.phone, smsBody).catch(err => console.error('[checkout] SMS error:', err));
              }

              // 2. Get provider info (may not exist)
              const providerInfo = await queryOne<{ provider_email: string; provider_name: string; provider_user_id: string }>(
                `SELECT pu.email as provider_email, pp.full_name as provider_name, ep.provider_user_id
                 FROM experience_providers ep
                 JOIN users pu ON pu.id = ep.provider_user_id
                 LEFT JOIN profiles pp ON pp.id = ep.provider_user_id
                 WHERE ep.experience_id = $1 AND ep.is_active = true
                 LIMIT 1`,
                [item.experienceId]
              );

              if (providerInfo) {
                // Provider Email
                await sendProviderBookingNotification({
                  providerEmail: providerInfo.provider_email,
                  providerName: providerInfo.provider_name ?? 'Furnizor',
                  experienceTitle: clientInfo.title,
                  clientName: clientInfo.full_name ?? 'Client',
                  bookingDate: dateStr,
                  participants: Number(item.participants),
                  totalPrice: Number(item.totalPrice),
                  bookingId: booking.id,
                }).catch(err => console.error('[checkout] Provider email error:', err));

                // Provider DB Notification + Web Push
                await createProviderNotification(
                  providerInfo.provider_user_id,
                  `Rezervare nouă — ${clientInfo.title}`,
                  `Ai o rezervare nouă de la ${clientInfo.full_name ?? 'Client'} pentru data ${dateStr}.`,
                  'booking_confirmed',
                  booking.id
                ).catch(err => console.error('[checkout] Provider notification error:', err));
              } else {
                console.warn(`[checkout] No active provider for experience ${item.experienceId}, skipping provider notification`);
              }
            } else {
              console.error(`[checkout] Could not find client info for user ${userId}`);
            }
          } catch (err) {
            console.error('[checkout] Notification error:', err);
          }
        })();
      }
    }

    res.json({ success: true, successCount });
  } catch (err: any) {
    console.error('Verify checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
