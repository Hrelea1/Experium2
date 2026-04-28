import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ─── GET /reviews/latest ──────────────────────────────────────────────────────
router.get('/latest', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 3;
    const reviews = await query(
      `SELECT r.id, r.user_id, r.rating, r.comment, r.created_at, 
              p.full_name as user_name, p.avatar_url as user_avatar,
              e.title as experience_title
       FROM reviews r
       JOIN profiles p ON p.id = r.user_id
       JOIN experiences e ON e.id = r.experience_id
       WHERE r.status = 'approved' AND r.comment IS NOT NULL AND trim(r.comment) != ''
       ORDER BY r.created_at DESC
       LIMIT $1`,
      [Math.min(limit, 10)]
    );
    res.json(reviews);
  } catch (err) {
    console.error('[reviews GET /latest]', err);
    res.status(500).json({ error: 'Eroare la preluarea recenziilor' });
  }
});

// ─── GET /reviews/experience/:id ──────────────────────────────────────────────
router.get('/experience/:id', async (req: Request, res: Response) => {
  try {
    const reviews = await query(
      `SELECT r.id, r.user_id, r.rating, r.comment, r.created_at, p.full_name as user_name, p.avatar_url as user_avatar
       FROM reviews r
       JOIN profiles p ON p.id = r.user_id
       WHERE r.experience_id = $1 AND r.status = 'approved'
       ORDER BY r.created_at DESC`,
      [req.params.id]
    );
    res.json(reviews);
  } catch (err) {
    console.error('[reviews GET /experience/:id]', err);
    res.status(500).json({ error: 'Eroare la preluarea recenziilor' });
  }
});

// ─── POST /reviews/experience/:id ─────────────────────────────────────────────
router.post('/experience/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { rating, comment } = req.body;
    const experienceId = req.params.id;
    const userId = req.user!.userId;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating-ul trebuie să fie între 1 și 5' });
    }

    // Upsert review (user can only leave one review per experience)
    await query(
      `INSERT INTO reviews (experience_id, user_id, rating, comment, status)
       VALUES ($1, $2, $3, $4, 'approved')
       ON CONFLICT (experience_id, user_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, status = 'approved', created_at = now()`,
      [experienceId, userId, rating, comment]
    );

    res.status(201).json({ message: 'Recenzie adăugată cu succes' });
  } catch (err) {
    console.error('[reviews POST /experience/:id]', err);
    res.status(500).json({ error: 'Eroare la salvarea recenziei' });
  }
});

// ─── DELETE /reviews/:id ──────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const reviewId = req.params.id;
    const userId = req.user!.userId;

    // We can also allow 'admin' to delete any review, but for now just the owner
    const result = await query(
      `DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING id`,
      [reviewId, userId]
    );

    if (result.length === 0) {
      return res.status(404).json({ error: 'Recenzia nu a fost găsită sau nu aveți permisiunea de a o șterge' });
    }

    res.json({ message: 'Recenzie ștearsă cu succes' });
  } catch (err) {
    console.error('[reviews DELETE /:id]', err);
    res.status(500).json({ error: 'Eroare la ștergerea recenziei' });
  }
});

export default router;
