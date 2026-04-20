import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// ─── GET /notifications ───────────────────────────────────────────────────────
// Returns all notifications for the logged-in provider
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const rows = await query(
      `SELECT id, provider_user_id, title, message, type, reference_id, is_read, created_at
       FROM provider_notifications
       WHERE provider_user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error('[notifications GET /]', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ─── PUT /notifications/:id/read ──────────────────────────────────────────────
// Mark a single notification as read
router.put('/:id/read', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    await query(
      'UPDATE provider_notifications SET is_read = true WHERE id = $1 AND provider_user_id = $2',
      [id, userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[notifications PUT /:id/read]', err);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// ─── PUT /notifications/read-all ──────────────────────────────────────────────
// Mark all notifications as read for the logged-in user
router.put('/read-all', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    await query(
      'UPDATE provider_notifications SET is_read = true WHERE provider_user_id = $1 AND is_read = false',
      [userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[notifications PUT /read-all]', err);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// ─── Web Push Subscriptions ───────────────────────────────────────────────────
const VAPID_PUBLIC_KEY_FALLBACK = 'BII1rdENXJ-1Ove4xpRX4PjAfWwycuqq6hyLa4p0PnucBAoJAnlmmMmCneD0uiYw3BU3yobxkrx-5CL1jb2y7bg';

router.get('/push/vapid-key', requireAuth, (_req: Request, res: Response) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY_FALLBACK;
  res.json({ publicKey });
});

router.post('/push/subscribe', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { endpoint, keys } = req.body;
    
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    await query(
      `INSERT INTO web_push_subscriptions (user_id, endpoint, keys_p256dh, keys_auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint) DO UPDATE
       SET keys_p256dh = EXCLUDED.keys_p256dh, keys_auth = EXCLUDED.keys_auth, created_at = now()`,
      [userId, endpoint, keys.p256dh, keys.auth]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[notifications POST /push/subscribe]', err);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

router.post('/push/unsubscribe', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint required' });
    }

    await query(
      'DELETE FROM web_push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [userId, endpoint]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[notifications POST /push/unsubscribe]', err);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

export default router;
