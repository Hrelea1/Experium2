import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAuth, requireAdmin, requireRole } from '../middleware/auth';
import { sendBookingConfirmation, sendCancellationConfirmation, sendProviderBookingNotification } from '../services/email';
import { 
  sendSms, 
  getBookingConfirmedSms, 
  getBookingCancelledSms, 
  getProviderNewBookingSms,
  getProviderBookingCancelledSms
} from '../services/sms';

const router = Router();

// ─── GET /bookings ────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'admin';

    const rows = await query(
      `SELECT
        b.id, b.booking_date, b.participants, b.participant_details, b.status, b.total_price,
        b.special_requests, b.cancellation_reason, b.rescheduled_count,
        b.created_at,
        e.id AS experience_id, e.title AS experience_title, e.location_name,
        (SELECT image_url FROM experience_images WHERE experience_id = e.id AND is_primary = true LIMIT 1) AS experience_image
       FROM bookings b
       JOIN experiences e ON e.id = b.experience_id
       WHERE ${isAdmin ? 'TRUE' : 'b.user_id = $1'}
       ORDER BY b.created_at DESC`,
      isAdmin ? [] : [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[bookings GET /]', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// ─── GET /bookings/provider (Provider/Admin) ──────────────────────────────────
router.get('/provider', requireRole('provider', 'admin'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const rows = await query(
      `SELECT
        b.id, b.booking_date, b.participants, b.participant_details, b.status, b.total_price,
        b.special_requests, b.cancellation_reason, b.rescheduled_count,
        b.created_at, b.user_id,
        e.title AS experience_title, e.location_name,
        p.full_name AS client_name, u.email AS client_email,
        (SELECT image_url FROM experience_images WHERE experience_id = e.id AND is_primary = true LIMIT 1) AS experience_image
       FROM bookings b
       JOIN experiences e ON e.id = b.experience_id
       JOIN experience_providers ep ON ep.experience_id = e.id
       JOIN users u ON u.id = b.user_id
       LEFT JOIN profiles p ON p.id = b.user_id
       WHERE ep.provider_user_id = $1 AND ep.is_active = true
       ORDER BY b.booking_date DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[bookings GET /provider]', err);
    res.status(500).json({ error: 'Failed to fetch provider bookings' });
  }
});

// ─── GET /bookings/:id ────────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const booking = await queryOne(
      `SELECT b.*, e.title AS experience_title, e.location_name, e.duration_minutes,
        u.email AS user_email, p.full_name AS user_full_name
       FROM bookings b
       JOIN experiences e ON e.id = b.experience_id
       JOIN users u ON u.id = b.user_id
       LEFT JOIN profiles p ON p.id = b.user_id
       WHERE b.id = $1 AND (b.user_id = $2 OR $3 = true)`,
      [req.params.id, req.user!.userId, req.user!.role === 'admin']
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    console.error('[bookings GET /:id]', err);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// ─── POST /bookings ───────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const {
      experience_id, booking_date, participants = 1, participant_details = [],
      total_price, payment_method = 'card', special_requests, voucher_id, status = 'confirmed',
    } = req.body;

    if (!experience_id || !booking_date || !total_price) {
      return res.status(400).json({ error: 'experience_id, booking_date, and total_price are required' });
    }

    const booking = await queryOne<{ id: string }>(
      `INSERT INTO bookings
        (user_id, experience_id, booking_date, participants, participant_details, total_price, payment_method, special_requests, voucher_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [req.user!.userId, experience_id, booking_date, participants, JSON.stringify(participant_details), total_price,
       payment_method, special_requests ?? null, voucher_id ?? null, status]
    );

    if (status === 'confirmed') {
      const dateStr = new Date(booking_date).toLocaleString('ro-RO');
      queryOne<{ email: string; full_name: string; title: string; phone: string | null }>(
        `SELECT u.email, p.full_name, p.phone, e.title
         FROM users u
         LEFT JOIN profiles p ON p.id = u.id
         JOIN experiences e ON e.id = $2
         WHERE u.id = $1`,
        [req.user!.userId, experience_id]
      ).then(async (info) => {
        if (info) {
          await sendBookingConfirmation({
            email: info.email,
            name: info.full_name ?? 'Client',
            experienceTitle: info.title,
            bookingDate: dateStr,
            participants: Number(participants),
            totalPrice: Number(total_price),
            bookingId: booking!.id,
          });

          if (info.phone) {
            const smsBody = getBookingConfirmedSms({
              title: info.title,
              date: dateStr,
              participants: Number(participants),
              bookingId: booking!.id
            });
            await sendSms(info.phone, smsBody);
          }

          query<{ email: string; full_name: string; phone: string | null }>(
            `SELECT u.email, p.full_name, p.phone
             FROM experience_providers ep
             JOIN users u ON u.id = ep.provider_user_id
             LEFT JOIN profiles p ON p.id = u.id
             WHERE ep.experience_id = $1 AND ep.is_active = true`,
            [experience_id]
          ).then(async (providers) => {
            for (const provider of providers) {
              if (provider.email) {
                await sendProviderBookingNotification({
                  providerEmail: provider.email,
                  providerName: provider.full_name ?? 'Furnizor',
                  experienceTitle: info.title,
                  clientName: info.full_name ?? 'Client',
                  bookingDate: dateStr,
                  participants: Number(participants),
                  totalPrice: Number(total_price),
                  bookingId: booking!.id,
                });
              }
              if (provider.phone) {
                const pSmsBody = getProviderNewBookingSms({
                  title: info.title,
                  date: dateStr,
                  clientName: info.full_name ?? 'Client',
                  participants: Number(participants)
                });
                await sendSms(provider.phone, pSmsBody);
              }
            }
          }).catch(err => console.error('[Provider Notification]', err));
        }
      }).catch(console.error);
    }

    res.status(201).json({ id: booking!.id, message: 'Booking created' });
  } catch (err) {
    console.error('[bookings POST]', err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// ─── POST /bookings/:id/cancel ────────────────────────────────────────────────
router.post('/:id/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { cancellation_reason } = req.body;
    const booking = await queryOne<{
      id: string; booking_date: string; status: string;
      experience_id: string; user_id: string;
    }>(
      'SELECT id, booking_date, status, experience_id, user_id FROM bookings WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.userId]
    );

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!['confirmed', 'pending'].includes(booking.status)) {
      return res.status(400).json({ error: 'Booking cannot be cancelled' });
    }

    const hoursUntil = (new Date(booking.booking_date).getTime() - Date.now()) / 3600000;
    const refundEligible = hoursUntil >= 48;

    await query(
      `UPDATE bookings SET status = 'cancelled', cancellation_date = now(),
       cancellation_reason = $1, updated_at = now() WHERE id = $2`,
      [cancellation_reason ?? null, req.params.id]
    );

    const dateStr = new Date(booking.booking_date).toLocaleString('ro-RO');

    queryOne<{ email: string; full_name: string; title: string; phone: string | null }>(
      `SELECT u.email, p.full_name, p.phone, e.title FROM users u
       LEFT JOIN profiles p ON p.id = u.id
       JOIN experiences e ON e.id = $2 WHERE u.id = $1`,
      [req.user!.userId, booking.experience_id]
    ).then(async (info) => {
      if (info) {
        await sendCancellationConfirmation({
          email: info.email,
          name: info.full_name ?? 'Client',
          experienceTitle: info.title,
          bookingId: req.params.id,
          refundEligible,
        });

        if (info.phone) {
          const smsBody = getBookingCancelledSms({
            title: info.title,
            date: dateStr,
            refundEligible
          });
          await sendSms(info.phone, smsBody);
        }

        query<{ email: string; full_name: string; phone: string | null }>(
          `SELECT u.email, p.full_name, p.phone
           FROM experience_providers ep
           JOIN users u ON u.id = ep.provider_user_id
           LEFT JOIN profiles p ON p.id = u.id
           WHERE ep.experience_id = $1 AND ep.is_active = true`,
          [booking.experience_id]
        ).then(async (providers) => {
          for (const provider of providers) {
            if (provider.phone) {
              const pSmsBody = getProviderBookingCancelledSms({
                title: info.title,
                date: dateStr,
                clientName: info.full_name ?? 'Client'
              });
              await sendSms(provider.phone, pSmsBody);
            }
          }
        }).catch(err => console.error('[Provider Cancellation Notification]', err));
      }
    }).catch(console.error);

    res.json({ success: true, refund_eligible: refundEligible });
  } catch (err) {
    console.error('[bookings cancel]', err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// ─── POST /bookings/:id/reschedule ────────────────────────────────────────────
router.post('/:id/reschedule', requireAuth, async (req: Request, res: Response) => {
  try {
    const { new_booking_date } = req.body;
    if (!new_booking_date) return res.status(400).json({ error: 'new_booking_date required' });

    const booking = await queryOne<{ status: string; rescheduled_count: number }>(
      'SELECT status, rescheduled_count FROM bookings WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.userId]
    );

    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (!['confirmed', 'pending'].includes(booking.status)) {
      return res.status(400).json({ error: 'Booking cannot be rescheduled' });
    }
    if (booking.rescheduled_count >= 1) {
      return res.status(400).json({ error: 'You can only reschedule a booking once' });
    }

    await query(
      `UPDATE bookings SET booking_date = $1, rescheduled_count = rescheduled_count + 1, updated_at = now()
       WHERE id = $2`,
      [new_booking_date, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[bookings reschedule]', err);
    res.status(500).json({ error: 'Failed to reschedule booking' });
  }
});

// ─── PATCH /bookings/:id/status ──────────────────────────────
router.patch('/:id/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user!.userId;
    const role = req.user!.role;
    const isAdmin = role === 'admin';

    if (!['confirmed', 'cancelled', 'completed', 'pending', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (!isAdmin) {
      if (role === 'provider') {
        const assignment = await queryOne(
          `SELECT 1 FROM bookings b
           JOIN experience_providers ep ON ep.experience_id = b.experience_id
           WHERE b.id = $1 AND ep.provider_user_id = $2 AND ep.is_active = true`,
          [id, userId]
        );
        if (!assignment) return res.status(403).json({ error: 'Not authorized' });
      } else {
        const ownership = await queryOne(`SELECT 1 FROM bookings WHERE id = $1 AND user_id = $2`, [id, userId]);
        if (!ownership) return res.status(403).json({ error: 'Not authorized' });
        if (!['confirmed', 'cancelled'].includes(status)) {
          return res.status(403).json({ error: 'Users restricted' });
        }
      }
    }

    const dbStatus = status === 'declined' ? 'cancelled' : status;
    const reason = status === 'declined' ? 'Provider declined' : null;

    const prevBooking = await queryOne<{ status: string; total_price: number; booking_date: string; participants: number; experience_id: string }>(
      `SELECT status, total_price, booking_date, participants, experience_id FROM bookings WHERE id = $1`,
      [id]
    );

    await query(
      `UPDATE bookings SET status = $1, cancellation_reason = COALESCE($2, cancellation_reason), updated_at = now()
       WHERE id = $3`,
      [dbStatus, reason, id]
    );

    if (dbStatus === 'confirmed' && prevBooking && prevBooking.status !== 'confirmed') {
      const dateStr = new Date(prevBooking.booking_date).toLocaleString('ro-RO');
      queryOne<{ email: string; full_name: string; title: string; phone: string | null; user_id: string }>(
        `SELECT u.email, p.full_name, p.phone, e.title, b.user_id
         FROM bookings b
         JOIN users u ON u.id = b.user_id
         LEFT JOIN profiles p ON p.id = u.id
         JOIN experiences e ON e.id = b.experience_id
         WHERE b.id = $1`,
        [id]
      ).then(async (info) => {
        if (info) {
          await sendBookingConfirmation({
            email: info.email,
            name: info.full_name ?? 'Client',
            experienceTitle: info.title,
            bookingDate: dateStr,
            participants: Number(prevBooking.participants),
            totalPrice: Number(prevBooking.total_price),
            bookingId: id,
          });

          if (info.phone) {
             const smsBody = getBookingConfirmedSms({
              title: info.title,
              date: dateStr,
              participants: Number(prevBooking.participants),
              bookingId: id
            });
            await sendSms(info.phone, smsBody);
          }

          query<{ email: string; full_name: string; phone: string | null }>(
            `SELECT u.email, p.full_name, p.phone
             FROM experience_providers ep
             JOIN users u ON u.id = ep.provider_user_id
             LEFT JOIN profiles p ON p.id = u.id
             WHERE ep.experience_id = $1 AND ep.is_active = true`,
            [prevBooking.experience_id]
          ).then(async (providers) => {
            for (const provider of providers) {
              if (provider.email) {
                await sendProviderBookingNotification({
                  providerEmail: provider.email,
                  providerName: provider.full_name ?? 'Furnizor',
                  experienceTitle: info.title,
                  clientName: info.full_name ?? 'Client',
                  bookingDate: dateStr,
                  participants: Number(prevBooking.participants),
                  totalPrice: Number(prevBooking.total_price),
                  bookingId: id,
                });
              }
              if (provider.phone) {
                const pSmsBody = getProviderNewBookingSms({
                  title: info.title,
                  date: dateStr,
                  clientName: info.full_name ?? 'Client',
                  participants: Number(prevBooking.participants)
                });
                await sendSms(provider.phone, pSmsBody);
              }
            }
          }).catch(err => console.error('[Provider Notification]', err));
        }
      }).catch(console.error);
    }

    res.json({ success: true, status: dbStatus });
  } catch (err) {
    console.error('[bookings PATCH /status]', err);
    res.status(500).json({ error: 'Failed' });
  }
});

export default router;
