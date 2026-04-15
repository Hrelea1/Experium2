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
        // Trigger notifications in background
        queryOne<{ email: string; full_name: string; title: string; phone: string | null; provider_email: string; provider_name: string; provider_user_id: string }>(
          `SELECT u.email, p.full_name, p.phone, e.title, pu.email as provider_email, pp.full_name as provider_name, ep.provider_user_id
           FROM users u
           LEFT JOIN profiles p ON p.id = u.id
           JOIN experiences e ON e.id = $2
           JOIN experience_providers ep ON ep.experience_id = e.id AND ep.is_active = true
           JOIN users pu ON pu.id = ep.provider_user_id
           LEFT JOIN profiles pp ON pp.id = ep.provider_user_id
           WHERE u.id = $1`,
          [userId, item.experienceId]
        ).then(async (info) => {
          if (info) {
            const dateStr = new Date(bookingDate).toLocaleString('ro-RO');
            
            // Client Email
            await sendBookingConfirmation({
              email: info.email,
              name: info.full_name ?? 'Client',
              experienceTitle: info.title,
              bookingDate: dateStr,
              participants: Number(item.participants),
              totalPrice: Number(item.totalPrice),
              bookingId: booking.id,
            });

            // Provider Email
            await sendProviderBookingNotification({
              providerEmail: info.provider_email,
              providerName: info.provider_name ?? 'Furnizor',
              experienceTitle: info.title,
              clientName: info.full_name ?? 'Client',
              bookingDate: dateStr,
              participants: Number(item.participants),
              totalPrice: Number(item.totalPrice),
              bookingId: booking.id,
            });

            // Provider DB Notification + Web Push
            await createProviderNotification(
              info.provider_user_id,
              `Rezervare nouă — ${info.title}`,
              `Ai o rezervare nouă de la ${info.full_name ?? 'Client'} pentru data ${dateStr}.`,
              'booking_confirmed',
              booking.id
            );

            // Client SMS
            if (info.phone) {
              const smsBody = getBookingConfirmedSms({
                title: info.title,
                date: dateStr,
                participants: Number(item.participants),
                bookingId: booking.id
              });
              await sendSms(info.phone, smsBody);
            }
          }
        }).catch(console.error);
      }
    }

    res.json({ success: true, successCount });
  } catch (err: any) {
    console.error('Verify checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
