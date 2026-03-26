import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAdmin } from '../middleware/auth';
import bcrypt from 'bcryptjs';

const router = Router();

// All routes under /admin require admin role

// ─── GET /admin/users ─────────────────────────────────────────────────────────
router.get('/users', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { search, role, limit = '50', offset = '0' } = req.query as Record<string, string>;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (search) {
      conditions.push(`(u.email ILIKE $${idx} OR p.full_name ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (role) {
      conditions.push(`u.role = $${idx++}`);
      params.push(role);
    }

    params.push(parseInt(limit), parseInt(offset));
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const rows = await query(
      `SELECT u.id, u.email, u.role, u.is_verified, u.created_at,
        p.full_name, p.phone, p.avatar_url
       FROM users u
       LEFT JOIN profiles p ON p.id = u.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json(rows);
  } catch (err) {
    console.error('[admin/users GET]', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ─── GET /admin/users/:id ─────────────────────────────────────────────────────
router.get('/users/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const user = await queryOne(
      `SELECT u.id, u.email, u.role, u.is_verified, u.created_at,
        p.full_name, p.phone, p.avatar_url
       FROM users u LEFT JOIN profiles p ON p.id = u.id
       WHERE u.id = $1`,
      [req.params.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('[admin/users/:id GET]', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ─── PUT /admin/users/:id/role ────────────────────────────────────────────────
router.put('/users/:id/role', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const validRoles = ['admin', 'moderator', 'provider', 'user'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    await query('UPDATE users SET role = $1, updated_at = now() WHERE id = $2', [role, req.params.id]);
    res.json({ message: 'Role updated' });
  } catch (err) {
    console.error('[admin/users/:id/role PUT]', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// ─── DELETE /admin/users/:id ──────────────────────────────────────────────────
// Replaces the delete-user edge function
router.delete('/users/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    // Prevent deleting the primary admin
    const user = await queryOne<{ email: string }>(
      'SELECT email FROM users WHERE id = $1',
      [req.params.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.email === 'hrelea001@gmail.com') {
      return res.status(403).json({ error: 'Cannot delete the primary admin account' });
    }

    // Delete user (cascades to profiles, bookings, vouchers, etc.)
    await query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('[admin/users/:id DELETE]', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ─── GET /admin/stats ─────────────────────────────────────────────────────────
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const [users, bookings, vouchers, revenue] = await Promise.all([
      queryOne<{ count: string }>('SELECT COUNT(*) AS count FROM users WHERE is_verified = true'),
      queryOne<{ count: string; pending: string }>(`
        SELECT 
          COUNT(*) AS count,
          COUNT(*) FILTER (WHERE status = 'pending') AS pending
        FROM bookings`),
      queryOne<{ count: string }>('SELECT COUNT(*) AS count FROM vouchers WHERE status = $1', ['active']),
      queryOne<{ total: string }>('SELECT COALESCE(SUM(total_price), 0) AS total FROM bookings WHERE status = $1', ['confirmed']),
    ]);

    res.json({
      total_users: parseInt(users?.count ?? '0'),
      total_bookings: parseInt(bookings?.count ?? '0'),
      pending_bookings: parseInt(bookings?.pending ?? '0'),
      active_vouchers: parseInt(vouchers?.count ?? '0'),
      confirmed_revenue: parseFloat(revenue?.total ?? '0'),
    });
  } catch (err) {
    console.error('[admin/stats GET]', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── GET /admin/categories ────────────────────────────────────────────────────
router.get('/categories', requireAdmin, async (req: Request, res: Response) => {
  try {
    const rows = await query('SELECT * FROM categories ORDER BY display_order ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ─── POST /admin/categories ───────────────────────────────────────────────────
router.post('/categories', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, slug, icon, image_url, description, display_order } = req.body;
    const row = await queryOne<{ id: string }>(
      `INSERT INTO categories (name, slug, icon, image_url, description, display_order)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [name, slug, icon ?? null, image_url ?? null, description ?? null, display_order ?? 0]
    );
    res.status(201).json({ id: row!.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

export default router;
