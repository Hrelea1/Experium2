import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { optionalAuth } from '../middleware/auth';
import { query, queryOne } from '../db';
import { sendBookingConfirmation, sendProviderBookingNotification } from '../services/email';
import { sendSms, getBookingConfirmedSms } from '../services/sms';
import { createProviderNotification } from '../services/providerNotifications';
import crypto from 'crypto';

const router = Router();
const stripeToken = process.env.STRIPE_SECRET_KEY || 'sk_test_51O...';
const stripe = new Stripe(stripeToken, { apiVersion: '2023-10-16' as any });

// ─── Helper: find existing user by email or create a guest account ────────────
async function resolveUserId(params: {
  loggedInUserId?: string;
  guestEmail?: string;
  guestName?: string;
  guestPhone?: string;
}): Promise<string | null> {
  // If already logged in, use that account
  if (params.loggedInUserId) return params.loggedInUserId;

  if (!params.guestEmail) return null;

  const email = params.guestEmail.toLowerCase().trim();

  // Amazon behavior: find existing account by email → reuse it
  const existing = await queryOne<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
  if (existing) {
    // Update profile name/phone if provided and profile exists
    if (params.guestName || params.guestPhone) {
      await query(
        `INSERT INTO profiles (id, full_name, phone)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE
           SET full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
               phone     = COALESCE(EXCLUDED.phone, profiles.phone)`,
        [existing.id, params.guestName ?? null, params.guestPhone ?? null]
      );
    }
    console.log(`[checkout] Guest email matched existing user: ${existing.id}`);
    return existing.id;
  }

  // No account found → create a guest user with a random password
  const randomPassword = crypto.randomBytes(24).toString('hex');
  const bcrypt = require('bcryptjs');
  const hashed = await bcrypt.hash(randomPassword, 10);

  const newUser = await queryOne<{ id: string }>(
    `INSERT INTO users (email, password_hash, role, is_verified)
     VALUES ($1, $2, 'user', true)
     RETURNING id`,
    [email, hashed]
  );

  if (!newUser) return null;

  // Create profile
  await query(
    `INSERT INTO profiles (id, full_name, phone) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [newUser.id, params.guestName ?? null, params.guestPhone ?? null]
  );

  console.log(`[checkout] Created guest user ${newUser.id} for email ${email}`);
  return newUser.id;
}

// ─── POST /checkout/create-session ───────────────────────────────────────────
router.post('/create-session', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { items, success_url, cancel_url, guestEmail, guestName, guestPhone } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'No items provided' });
    }

    // Resolve the user (logged-in or guest)
    const userId = await resolveUserId({
      loggedInUserId: req.user?.userId,
      guestEmail,
      guestName,
      guestPhone,
    });

    if (!userId) {
      return res.status(400).json({ error: 'Trebuie să furnizezi un email valid pentru a continua.' });
    }

    const line_items = items.map((item: any) => ({
      price_data: {
        currency: 'ron',
        product_data: {
          name: item.title || 'Experiență',
        },
        unit_amount: Math.round(item.totalPrice * 100),
      },
      quantity: 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: success_url + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url,
      customer_email: guestEmail || undefined, // pre-fill Stripe email for guests
      metadata: {
        userId,
        isGuest: req.user ? 'false' : 'true',
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

// ─── POST /checkout/verify-session ───────────────────────────────────────────
// Uses optionalAuth — works for both logged-in users and guests
router.post('/verify-session', optionalAuth, async (req: Request, res: Response) => {
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
    const emailResults: string[] = [];

    for (const item of items) {
      const bookingDate = `${item.slotDate}T${item.startTime}`;

      // ── 48-hour advance booking enforcement ─────────────────
      const hoursUntil = (new Date(bookingDate).getTime() - Date.now()) / 3_600_000;
      if (hoursUntil < 48) {
        console.warn(`[checkout] Slot rejected (<48h): ${bookingDate}`);
        continue;
      }

      // ── Capacity check + atomic slot reservation ─────────────
      const slotCheck = await queryOne<{ id: string; available: number }>(
        `SELECT id, (capacity - booked_count) AS available
         FROM availability_slots
         WHERE experience_id = $1
           AND slot_date = $2::date
           AND start_time = $3::time
         LIMIT 1
         FOR UPDATE`,
        [item.experienceId, item.slotDate, item.startTime]
      );

      if (!slotCheck) {
        console.warn(`[checkout] No matching slot found for experience ${item.experienceId} at ${item.slotDate} ${item.startTime}`);
        emailResults.push(`slot_not_found:${item.experienceId}:${item.slotDate}:${item.startTime}`);
        continue;
      }

      if (slotCheck.available < item.participants) {
        console.warn(`[checkout] Slot ${slotCheck.id} is full. Available: ${slotCheck.available}, requested: ${item.participants}`);
        emailResults.push(`slot_full:${slotCheck.id}:available=${slotCheck.available}:requested=${item.participants}`);
        continue;
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

        // ── Atomically increment booked_count on the slot ──────
        await query(
          `UPDATE availability_slots
           SET booked_count = booked_count + $1
           WHERE id = $2`,
          [item.participants, slotCheck.id]
        );
        console.log(`[checkout] ✅ Slot ${slotCheck.id} booked_count incremented by ${item.participants}`);

        // ── Send notifications ──────
        try {
          const dateStr = new Date(bookingDate).toLocaleString('ro-RO');

          console.log(`[checkout] Looking up client/experience info for user ${userId}, experience ${item.experienceId}...`);
          const clientInfo = await queryOne<{ email: string; full_name: string; phone: string | null; title: string }>(
            `SELECT u.email, p.full_name, p.phone, e.title
             FROM users u
             LEFT JOIN profiles p ON p.id = u.id
             JOIN experiences e ON e.id = $2
             WHERE u.id = $1`,
            [userId, item.experienceId]
          );

          if (clientInfo) {
            console.log(`[checkout] Client found: ${clientInfo.full_name} (${clientInfo.email}). Title: ${clientInfo.title}`);
            // Client Email
            try {
              console.log(`[checkout] Dispatching confirmation email to ${clientInfo.email}...`);
              await sendBookingConfirmation({
                email: clientInfo.email,
                name: clientInfo.full_name ?? 'Client',
                experienceTitle: clientInfo.title,
                bookingDate: dateStr,
                participants: Number(item.participants),
                totalPrice: Number(item.totalPrice),
                bookingId: booking.id,
              });
              console.log(`[checkout] ✅ Client email sent successfully to ${clientInfo.email}`);
              emailResults.push(`client_email:${clientInfo.email}:OK`);
            } catch (emailErr: any) {
              console.error(`[checkout] ❌ Client email FAILED for ${clientInfo.email}:`, emailErr.message, emailErr.code || '');
              emailResults.push(`client_email:${clientInfo.email}:FAIL:${emailErr.message}`);
            }

            // Client SMS
            if (clientInfo.phone) {
              try {
                const smsBody = getBookingConfirmedSms({
                  title: clientInfo.title,
                  date: dateStr,
                  participants: Number(item.participants),
                  bookingId: booking.id
                });
                await sendSms(clientInfo.phone, smsBody);
                console.log(`[checkout] ✅ Client SMS sent to ${clientInfo.phone}`);
              } catch (smsErr: any) {
                console.error(`[checkout] ❌ Client SMS FAILED:`, smsErr.message);
              }
            }

            // Provider notification
            console.log(`[checkout] Looking up provider info for experience ${item.experienceId}...`);
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
              console.log(`[checkout] Provider found: ${providerInfo.provider_name} (${providerInfo.provider_email})`);
              try {
                console.log(`[checkout] Dispatching provider notification email to ${providerInfo.provider_email}...`);
                await sendProviderBookingNotification({
                  providerEmail: providerInfo.provider_email,
                  providerName: providerInfo.provider_name ?? 'Furnizor',
                  experienceTitle: clientInfo.title,
                  clientName: clientInfo.full_name ?? 'Client',
                  clientEmail: clientInfo.email,
                  bookingDate: dateStr,
                  participants: Number(item.participants),
                  totalPrice: Number(item.totalPrice),
                  bookingId: booking.id,
                });
                console.log(`[checkout] ✅ Provider email sent to ${providerInfo.provider_email}`);
                emailResults.push(`provider_email:${providerInfo.provider_email}:OK`);
              } catch (provEmailErr: any) {
                console.error(`[checkout] ❌ Provider email FAILED for ${providerInfo.provider_email}:`, provEmailErr.message);
                emailResults.push(`provider_email:${providerInfo.provider_email}:FAIL:${provEmailErr.message}`);
              }

              await createProviderNotification(
                providerInfo.provider_user_id,
                `Rezervare nouă — ${clientInfo.title}`,
                `Ai o rezervare nouă de la ${clientInfo.full_name ?? 'Client'} pentru data ${dateStr}.`,
                'booking_confirmed',
                booking.id
              ).catch(err => console.error('[checkout] Provider in-app notification error:', err));
            } else {
              console.warn(`[checkout] No active provider found for experience ${item.experienceId}`);
            }
          } else {
            console.error(`[checkout] ❌ Data mismatch: Could not find client or experience details for user ${userId}, experience ${item.experienceId}`);
            emailResults.push(`client_info:NOT_FOUND`);
          }
        } catch (notifErr: any) {
          console.error('[checkout] ❌ Fatal error in notification block:', notifErr.stack);
          emailResults.push(`notification_error:${notifErr.message}`);
        }
      }
    }

    console.log(`[checkout] ✅ verify-session complete: ${successCount} bookings, email results:`, emailResults);
    res.json({ success: true, successCount, emailResults });
  } catch (err: any) {
    console.error('Verify checkout error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
