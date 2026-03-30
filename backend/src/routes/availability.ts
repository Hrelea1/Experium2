import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import { sendAvailabilityRequest } from '../services/email';
import { sendWhatsAppProviderAlert } from '../services/whatsapp';
import crypto from 'crypto';

const router = Router();

// ─── GET /availability/:experience_id ──────────────────────────────────────────
// Returns available slots for a given experience
router.get('/:experience_id', async (req: Request, res: Response) => {
  try {
    const { experience_id } = req.params;
    const { from, to } = req.query as { from?: string; to?: string };

    const rows = await query(
      `SELECT id, experience_id, TO_CHAR(slot_date, 'YYYY-MM-DD') AS slot_date, start_time,
        COALESCE(end_time, start_time + interval '1 hour') AS end_time,
        capacity, booked_count,
        (capacity - booked_count) AS available_spots,
        COALESCE(is_locked, false) AS is_locked
       FROM availability_slots
       WHERE experience_id = $1
         AND COALESCE(is_locked, false) = false
         AND (capacity - booked_count) > 0
         AND slot_date >= COALESCE($2::date, CURRENT_DATE)
         ${to ? `AND slot_date <= $3` : ''}
       ORDER BY slot_date ASC, start_time ASC`,
      [experience_id, from || null, ...(to ? [to] : [])]
    );
    res.json(rows);
  } catch (err) {
    console.error('[availability GET]', err);
    res.status(500).json({ error: 'Failed to fetch availability' });
  }
});

// ─── GET /availability ─────────────────────────────────────────────────────────
// Returns all slots for the logged-in provider (normalized for dashboard)
router.get('/', requireRole('admin', 'provider'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { from } = req.query as { from?: string };

    const rows = await query(
      `SELECT id, experience_id, TO_CHAR(slot_date, 'YYYY-MM-DD') AS slot_date, start_time,
              COALESCE(end_time, start_time + interval '1 hour') AS end_time,
              capacity, booked_count,
              COALESCE(is_locked, false) AS is_locked, locked_by, locked_until
       FROM availability_slots
       WHERE provider_user_id = $1
       ${from ? `AND slot_date >= $2` : ''}
       ORDER BY slot_date ASC, start_time ASC`,
      [userId, ...(from ? [from] : [])]
    );

    // Normalize to shape expected by ProviderDashboard
    const normalised = rows.map((s: any) => ({
      ...s,
      max_participants: s.capacity,
      booked_participants: s.booked_count,
      is_available: !s.is_locked && (s.capacity - s.booked_count) > 0,
    }));

    res.json(normalised);
  } catch (err) {
    console.error('[availability GET /]', err);
    res.status(500).json({ error: 'Failed to fetch provider availability' });
  }
});

// ─── POST /availability/slots (Provider/Admin) ────────────────────────────────
// Create availability slots for an experience
router.post('/slots', requireRole('admin', 'provider', 'moderator'), async (req: Request, res: Response) => {
  try {
    const { experience_id, slot_date, start_time, end_time, capacity } = req.body;
    const userId = req.user!.userId;

    const slot = await queryOne<{ id: string }>(
      `INSERT INTO availability_slots (experience_id, provider_user_id, slot_date, start_time, end_time, capacity, booked_count, is_locked)
       VALUES ($1, $2, $3, $4, $5, $6, 0, false)
       RETURNING id`,
      [experience_id, userId, slot_date, start_time, end_time || null, capacity || 10]
    );

    res.status(201).json({ id: slot!.id });
  } catch (err: any) {
    console.error('[availability POST /slots]', err);
    res.status(500).json({ error: 'Failed to create slot (' + (err.message || String(err)) + ')' });
  }
});

// ─── DELETE /availability/slots/:id (Provider/Admin) ──────────────────────────
router.delete('/slots/:id', requireRole('admin', 'provider'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'admin';

    // Verify ownership if not admin
    if (!isAdmin) {
      const slot = await queryOne('SELECT 1 FROM availability_slots WHERE id = $1 AND provider_user_id = $2', [id, userId]);
      if (!slot) return res.status(403).json({ error: 'Not authorized to delete this slot' });
    }

    await query('DELETE FROM availability_slots WHERE id = $1', [id]);
    res.json({ message: 'Slot deleted' });
  } catch (err) {
    console.error('[availability DELETE /slots/:id]', err);
    res.status(500).json({ error: 'Failed to delete slot' });
  }
});

// ─── POST /availability/slots/:id/lock ────────────────────────────────────────
// Temporarily lock a slot for a user (5-minute hold during checkout)
router.post('/slots/:id/lock', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Check slot exists and isn't already locked by someone else
    const slot = await queryOne<{
      id: string; is_locked: boolean; locked_by: string | null;
      locked_until: string | null; capacity: number; booked_count: number;
    }>(
      'SELECT id, is_locked, locked_by, locked_until, capacity, booked_count FROM availability_slots WHERE id = $1',
      [id]
    );

    if (!slot) return res.status(404).json({ error: 'Slot not found' });

    // Check if slot has capacity
    if (slot.capacity - slot.booked_count <= 0) {
      return res.json([{ success: false, error_message: 'Slotul este plin.' }]);
    }

    // Check if locked by another user and lock hasn't expired
    if (slot.is_locked && slot.locked_by !== userId) {
      const lockExpiry = slot.locked_until ? new Date(slot.locked_until) : new Date(0);
      if (lockExpiry > new Date()) {
        return res.json([{ success: false, error_message: 'Slotul este blocat de alt utilizator.' }]);
      }
    }

    // Lock the slot for 5 minutes
    const lockedUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await query(
      `UPDATE availability_slots SET is_locked = true, locked_by = $1, locked_until = $2 WHERE id = $3`,
      [userId, lockedUntil, id]
    );

    res.json([{ success: true }]);
  } catch (err) {
    console.error('[availability POST /slots/:id/lock]', err);
    res.status(500).json({ error: 'Failed to lock slot' });
  }
});

// ─── POST /availability/slots/:id/unlock ──────────────────────────────────────
// Release a slot lock
router.post('/slots/:id/unlock', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    await query(
      `UPDATE availability_slots SET is_locked = false, locked_by = NULL, locked_until = NULL
       WHERE id = $1 AND locked_by = $2`,
      [id, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[availability POST /slots/:id/unlock]', err);
    res.status(500).json({ error: 'Failed to unlock slot' });
  }
});

// ─── POST /availability/check ─────────────────────────────────────────────────
// Replaces initiate-availability-check edge function
// Sends email to provider asking them to confirm/decline availability
router.post('/check', requireAuth, async (req: Request, res: Response) => {
  try {
    const { booking_id } = req.body;
    if (!booking_id) return res.status(400).json({ error: 'booking_id required' });

    // Fetch booking + experience + provider info
    const info = await queryOne<{
      experience_id: string; experience_title: string;
      booking_date: string; participants: number; provider_email: string; provider_name: string;
      provider_phone: string | null;
    }>(
      `SELECT e.id AS experience_id, e.title AS experience_title,
        b.booking_date, b.participants,
        pu.email AS provider_email, pp.full_name AS provider_name, pp.phone AS provider_phone
       FROM bookings b
       JOIN experiences e ON e.id = b.experience_id
       JOIN experience_providers ep ON ep.experience_id = e.id AND ep.is_active = true
       JOIN users pu ON pu.id = ep.provider_user_id
       LEFT JOIN profiles pp ON pp.id = ep.provider_user_id
       WHERE b.id = $1`,
      [booking_id]
    );

    if (!info) return res.status(404).json({ error: 'Booking or provider not found' });

    const confirmToken = crypto.randomUUID();
    const declineToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await query(
      `INSERT INTO availability_requests (booking_id, confirm_token, decline_token, status, expires_at)
       VALUES ($1, $2, $3, 'pending', $4)`,
      [booking_id, confirmToken, declineToken, expiresAt.toISOString()]
    );

    const appUrl = process.env.APP_URL ?? 'https://experium.ro';
    await sendAvailabilityRequest({
      providerEmail: info.provider_email,
      providerName: info.provider_name ?? 'Provider',
      experienceTitle: info.experience_title,
      bookingDate: new Date(info.booking_date).toLocaleString('ro-RO'),
      confirmUrl: `${appUrl}/api/availability/respond?token=${confirmToken}&action=confirm`,
      declineUrl: `${appUrl}/api/availability/respond?token=${declineToken}&action=decline`,
    });

    if (info.provider_phone) {
      await sendWhatsAppProviderAlert({
        phone: info.provider_phone,
        experienceTitle: info.experience_title,
        bookingDate: new Date(info.booking_date).toLocaleString('ro-RO'),
        participants: info.participants,
      });
    }

    res.json({ message: 'Availability request sent to provider' });
  } catch (err) {
    console.error('[availability /check]', err);
    res.status(500).json({ error: 'Failed to initiate availability check' });
  }
});

// ─── POST /availability/respond ───────────────────────────────────────────────
// Replaces process-availability-response edge function
router.post('/respond', async (req: Request, res: Response) => {
  try {
    const { token, action } = req.body;
    if (!token || !['confirm', 'decline'].includes(action)) {
      return res.status(400).json({ error: 'token and action (confirm|decline) required' });
    }

    const tokenColumn = action === 'confirm' ? 'confirm_token' : 'decline_token';
    const request = await queryOne<{ id: string; booking_id: string; expires_at: string; status: string }>(
      `SELECT id, booking_id, expires_at, status FROM availability_requests WHERE ${tokenColumn} = $1`,
      [token]
    );

    if (!request) return res.status(404).json({ error: 'Invalid token' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });
    if (new Date(request.expires_at) < new Date()) {
      await query('UPDATE availability_requests SET status = $1 WHERE id = $2', ['expired', request.id]);
      return res.status(410).json({ error: 'Request expired' });
    }

    if (action === 'confirm') {
      await query('UPDATE availability_requests SET status = $1 WHERE id = $2', ['confirmed', request.id]);
    } else {
      await query('UPDATE availability_requests SET status = $1 WHERE id = $2', ['declined', request.id]);
      await query(`UPDATE bookings SET status = 'cancelled', cancellation_reason = 'Provider declined availability' WHERE id = $1`, [request.booking_id]);
    }

    res.json({ success: true, action });
  } catch (err) {
    console.error('[availability /respond]', err);
    res.status(500).json({ error: 'Failed to process response' });
  }
});

// ─── GET /availability/respond (for email link clicks) ────────────────────────
router.get('/respond', async (req: Request, res: Response) => {
  const { token, action } = req.query as { token: string; action: string };
  // Forward to POST handler by synthesizing the request body inline
  req.body = { token, action };

  // Inline processing for GET (email link) — same logic as POST
  try {
    const tokenColumn = action === 'confirm' ? 'confirm_token' : 'decline_token';
    const request = await queryOne<{ id: string; booking_id: string; expires_at: string; status: string }>(
      `SELECT id, booking_id, expires_at, status FROM availability_requests WHERE ${tokenColumn} = $1`,
      [token]
    );

    if (!request || request.status !== 'pending') {
      return res.send('<h2>Cerere invalidă sau deja procesată.</h2>');
    }
    if (new Date(request.expires_at) < new Date()) {
      return res.send('<h2>Cererea a expirat.</h2>');
    }

    if (action === 'confirm') {
      await query('UPDATE availability_requests SET status = $1 WHERE id = $2', ['confirmed', request.id]);
      res.send('<h2 style="color:green">✅ Disponibilitate confirmată! Clientul va fi notificat.</h2>');
    } else {
      await query('UPDATE availability_requests SET status = $1 WHERE id = $2', ['declined', request.id]);
      await query(`UPDATE bookings SET status = 'cancelled', cancellation_reason = 'Provider declined' WHERE id = $1`, [request.booking_id]);
      res.send('<h2 style="color:red">❌ Disponibilitate refuzată. Clientul va fi notificat.</h2>');
    }
  } catch (err) {
    console.error('[availability GET /respond]', err);
    res.status(500).send('<h2>Eroare server. Încearcă din nou.</h2>');
  }
});

export default router;
