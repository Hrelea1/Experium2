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
        p.full_name, p.phone, p.avatar_url,
        COALESCE(pp.is_starred, false) AS is_starred
       FROM users u
       LEFT JOIN profiles p ON p.id = u.id
       LEFT JOIN provider_profiles pp ON pp.user_id = u.id
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
        p.full_name, p.phone, p.avatar_url,
        COALESCE(pp.is_starred, false) AS is_starred
       FROM users u 
       LEFT JOIN profiles p ON p.id = u.id
       LEFT JOIN provider_profiles pp ON pp.user_id = u.id
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
    const userId = req.params.id;
    const validRoles = ['admin', 'moderator', 'provider', 'user'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    // Verify the user exists
    const userExists = await queryOne<{ id: string }>('SELECT id FROM users WHERE id = $1', [userId]);
    if (!userExists) {
      return res.status(404).json({ error: 'User not found' });
    }

    await query('UPDATE users SET role = $1, updated_at = now() WHERE id = $2', [role, userId]);

    // When assigning 'provider' role, ensure a provider_profiles entry exists
    if (role === 'provider') {
      await query(
        `INSERT INTO provider_profiles (user_id, mode) VALUES ($1, 'instant')
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
    }

    // When revoking from 'provider' to another role, clean up provider_profiles
    if (role !== 'provider') {
      await query('DELETE FROM provider_profiles WHERE user_id = $1', [userId]);
    }

    res.json({ message: 'Role updated' });
  } catch (err) {
    console.error('[admin/users/:id/role PUT]', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// ─── PUT /admin/users/:id/star ────────────────────────────────────────────────
router.put('/users/:id/star', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { is_starred } = req.body;
    const userId = req.params.id;

    const user = await queryOne<{ role: string }>('SELECT role FROM users WHERE id = $1', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role !== 'provider') return res.status(400).json({ error: 'User is not a provider' });

    // Ensure profile exists, then update
    await query(`
      INSERT INTO provider_profiles (user_id, mode, is_starred)
      VALUES ($1, 'instant', $2)
      ON CONFLICT (user_id) DO UPDATE SET is_starred = EXCLUDED.is_starred
    `, [userId, is_starred]);
    res.json({ message: 'Star status updated' });
  } catch (err) {
    console.error('[admin/users/:id/star PUT]', err);
    res.status(500).json({ error: 'Failed to update star status' });
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

// ─── GET /admin/bookings ────────────────────────────────────────────────────────
router.get('/bookings', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { query } = require('../db');
    const bookings = await query(`
      SELECT b.*, e.title as experience_title, u.first_name, u.last_name, u.email
      FROM bookings b
      LEFT JOIN experiences e ON e.id = b.experience_id
      LEFT JOIN users u ON u.id = b.user_id
      ORDER BY b.created_at DESC
    `);
    
    const formatted = bookings.map((b: any) => ({
      ...b,
      experiences: { title: b.experience_title },
      user_profile: { full_name: `${b.first_name || ''} ${b.last_name || ''}`.trim(), email: b.email }
    }));
    
    res.json(formatted);
  } catch (err) {
    console.error('[GET /admin/bookings]', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// ─── PATCH /admin/bookings/:id/status ──────────────────────────────────────────
router.patch('/bookings/:id/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { query } = require('../db');
    await query('UPDATE bookings SET status = $1 WHERE id = $2', [req.body.status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[PATCH /admin/bookings/:id]', err);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
});

// ─── GET /admin/applications ───────────────────────────────────────────────────
router.get('/applications', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { query } = require('../db');
    const apps = await query('SELECT * FROM partner_applications ORDER BY created_at DESC');
    res.json(apps);
  } catch (err) {
    console.error('[GET /admin/applications]', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// ─── PATCH /admin/applications/:id/status ──────────────────────────────────────
router.patch('/applications/:id/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { query } = require('../db');
    await query('UPDATE partner_applications SET status = $1, updated_at = now() WHERE id = $2', [req.body.status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[PATCH /admin/applications/:id]', err);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

// ─── GET /admin/content-audit ──────────────────────────────────────────────────
router.get('/content-audit', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { query } = require('../db');
    // Note: the schema created created_at, but frontend expects changed_at. Adjusting alias.
    const logs = await query('SELECT id, section_key, old_content, new_content, changed_by, created_at AS changed_at FROM homepage_content_audit ORDER BY created_at DESC LIMIT 50');
    res.json(logs);
  } catch (err) {
    console.error('[GET /admin/content-audit]', err);
    res.status(500).json({ error: 'Failed to fetch content audit logs' });
  }
});

// ─── GET /admin/stats ─────────────────────────────────────────────────────────
router.get('/stats', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { query } = require('../db');
    const [
      users,
      bookings,
      vouchers,
      revenue,
      experiences,
      recentBookings,
      recentVouchers
    ] = await Promise.all([
      // Users count
      queryOne<{ count: string }>('SELECT COUNT(*) AS count FROM users WHERE is_verified = true'),
      // Bookings counts
      queryOne<{ count: string; pending: string; upcoming: string }>(`
        SELECT 
          COUNT(*) AS count,
          COUNT(*) FILTER (WHERE status = 'pending') AS pending,
          COUNT(*) FILTER (WHERE status = 'confirmed' AND booking_date >= CURRENT_TIMESTAMP) AS upcoming
        FROM bookings`),
      // Vouchers count
      queryOne<{ count: string; active: string }>(`
        SELECT 
          COUNT(*) AS count,
          COUNT(*) FILTER (WHERE status = 'active') AS active
        FROM vouchers`),
      // Revenue (from vouchers purchase_price to match frontend, or from bookings)
      // The frontend used voucher purchase_price for revenue total. So we will sum vouchers.
      queryOne<{ total: string }>('SELECT COALESCE(SUM(purchase_price), 0) AS total FROM vouchers'),
      // Experiences
      queryOne<{ count: string; active: string }>(`
        SELECT 
          COUNT(*) AS count,
          COUNT(*) FILTER (WHERE is_active = true) AS active
        FROM experiences`),
      // Recent bookings
      query(`
        SELECT 
          b.id, b.booking_date, b.status, b.participants, b.total_price, b.user_id,
          e.title AS experience_title, e.location_name
        FROM bookings b
        LEFT JOIN experiences e ON e.id = b.experience_id
        ORDER BY b.booking_date DESC
        LIMIT 10`),
      // Recent vouchers
      query(`
        SELECT 
          v.id, v.code, v.status, v.purchase_price, v.issue_date,
          e.title AS experience_title, e.location_name
        FROM vouchers v
        LEFT JOIN experiences e ON e.id = v.experience_id
        ORDER BY v.issue_date DESC
        LIMIT 10`)
    ]);

    res.json({
      total_users: parseInt(users?.count ?? '0'),
      total_bookings: parseInt(bookings?.count ?? '0'),
      pending_bookings: parseInt(bookings?.pending ?? '0'),
      upcoming_bookings: parseInt(bookings?.upcoming ?? '0'),
      total_vouchers: parseInt(vouchers?.count ?? '0'),
      active_vouchers: parseInt(vouchers?.active ?? '0'),
      total_experiences: parseInt(experiences?.count ?? '0'),
      active_experiences: parseInt(experiences?.active ?? '0'),
      total_revenue: parseFloat(revenue?.total ?? '0'),
      recent_bookings: recentBookings.map((b: any) => ({
        id: b.id,
        booking_date: b.booking_date,
        status: b.status,
        participants: b.participants,
        total_price: b.total_price,
        user_id: b.user_id,
        experiences: {
          title: b.experience_title,
          location_name: b.location_name
        }
      })),
      recent_vouchers: recentVouchers.map((v: any) => ({
        id: v.id,
        code: v.code,
        status: v.status,
        purchase_price: v.purchase_price,
        issue_date: v.issue_date,
        experiences: {
          title: v.experience_title,
          location_name: v.location_name
        }
      })),
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
