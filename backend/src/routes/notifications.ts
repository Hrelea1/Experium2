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

export default router;
