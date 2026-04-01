import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/auth';
import { query, queryOne } from '../db';
import { sendBookingConfirmation, sendProviderBookingNotification } from '../services/email';
import { sendWhatsAppBookingConfirmation } from '../services/whatsapp';

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

    // To prevent double bookings for the same checkout session, we could store session_id in bookings
    // For now, we will simply create the bookings and try to limit duplicates if needed
    const items = JSON.parse(metadata.itemsMetadata);
    const userId = metadata.userId;

    let successCount = 0;
    for (const item of items) {
      const bookingDate = `${item.slotDate}T${item.startTime}`;
      
      const booking = await queryOne<{ id: string }>(
        `INSERT INTO bookings
          (user_id, experience_id, booking_date, participants, participant_details, total_price, payment_method, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [userId, item.experienceId, bookingDate, item.participants, JSON.stringify(item.participantDetails), item.totalPrice, 'card', 'confirmed']
      );

      if (booking) {
        successCount++;
        // Trigger emails in background
        queryOne<{ email: string; full_name: string; title: string; phone: string | null }>(
          `SELECT u.email, p.full_name, p.phone, e.title
           FROM users u
           LEFT JOIN profiles p ON p.id = u.id
           JOIN experiences e ON e.id = $2
           WHERE u.id = $1`,
          [userId, item.experienceId]
        ).then(async (info) => {
          if (info) {
            await sendBookingConfirmation({
              email: info.email,
              name: info.full_name ?? 'Client',
              experienceTitle: info.title,
              bookingDate: new Date(bookingDate).toLocaleString('ro-RO'),
              participants: Number(item.participants),
              totalPrice: Number(item.totalPrice),
              bookingId: booking.id,
            });

            if (info.phone) {
              await sendWhatsAppBookingConfirmation({
                phone: info.phone,
                clientName: info.full_name ?? 'Client',
                experienceTitle: info.title,
                bookingDate: new Date(bookingDate).toLocaleString('ro-RO'),
                totalPrice: Number(item.totalPrice)
              });
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
