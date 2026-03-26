import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ─── GET /cart ────────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const items = await query(
      `SELECT ci.id, ci.quantity, ci.added_at,
        e.id AS experience_id, e.title, e.price, e.location_name, e.duration_minutes,
        (SELECT image_url FROM experience_images WHERE experience_id = e.id AND is_primary = true LIMIT 1) AS image
       FROM cart_items ci
       JOIN experiences e ON e.id = ci.experience_id
       WHERE ci.user_id = $1
       ORDER BY ci.added_at DESC`,
      [req.user!.userId]
    );
    res.json(items);
  } catch (err) {
    console.error('[cart GET /]', err);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

// ─── POST /cart ───────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { experience_id, quantity = 1 } = req.body;
    if (!experience_id) return res.status(400).json({ error: 'experience_id required' });

    // Upsert: if already in cart, increase quantity
    await query(
      `INSERT INTO cart_items (user_id, experience_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, experience_id)
       DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, added_at = now()`,
      [req.user!.userId, experience_id, quantity]
    );

    res.status(201).json({ message: 'Added to cart' });
  } catch (err) {
    console.error('[cart POST]', err);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// ─── PUT /cart/:id ────────────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'quantity must be >= 1' });
    }
    await query(
      'UPDATE cart_items SET quantity = $1 WHERE id = $2 AND user_id = $3',
      [quantity, req.params.id, req.user!.userId]
    );
    res.json({ message: 'Cart updated' });
  } catch (err) {
    console.error('[cart PUT /:id]', err);
    res.status(500).json({ error: 'Failed to update cart' });
  }
});

// ─── DELETE /cart/:id ─────────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    await query('DELETE FROM cart_items WHERE id = $1 AND user_id = $2', [req.params.id, req.user!.userId]);
    res.json({ message: 'Removed from cart' });
  } catch (err) {
    console.error('[cart DELETE /:id]', err);
    res.status(500).json({ error: 'Failed to remove from cart' });
  }
});

// ─── DELETE /cart ─────────────────────────────────────────────────────────────
router.delete('/', requireAuth, async (req: Request, res: Response) => {
  try {
    await query('DELETE FROM cart_items WHERE user_id = $1', [req.user!.userId]);
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    console.error('[cart DELETE /]', err);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

export default router;
