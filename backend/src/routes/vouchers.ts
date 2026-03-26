import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAuth } from '../middleware/auth';
import { generateVoucherCode } from '../services/otp';

const router = Router();

// ─── GET /vouchers ────────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const rows = await query(
      `SELECT v.*, e.title AS experience_title
       FROM vouchers v
       LEFT JOIN experiences e ON e.id = v.experience_id
       WHERE v.user_id = $1
       ORDER BY v.created_at DESC`,
      [req.user!.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('[vouchers GET /]', err);
    res.status(500).json({ error: 'Failed to fetch vouchers' });
  }
});

// ─── POST /vouchers ───────────────────────────────────────────────────────────
// Create a voucher (after purchase)
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { experience_id, purchase_price, expiry_months = 12 } = req.body;
    if (!experience_id || !purchase_price) {
      return res.status(400).json({ error: 'experience_id and purchase_price required' });
    }

    const code = await generateVoucherCode();
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + parseInt(String(expiry_months), 10));

    const voucher = await queryOne<{ id: string; code: string }>(
      `INSERT INTO vouchers (user_id, experience_id, code, status, purchase_price, expiry_date)
       VALUES ($1, $2, $3, 'active', $4, $5)
       RETURNING id, code`,
      [req.user!.userId, experience_id, code, purchase_price, expiryDate.toISOString()]
    );

    res.status(201).json(voucher);
  } catch (err) {
    console.error('[vouchers POST]', err);
    res.status(500).json({ error: 'Failed to create voucher' });
  }
});

// ─── POST /vouchers/validate ──────────────────────────────────────────────────
router.post('/validate', requireAuth, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Voucher code required' });

    const voucher = await queryOne<{
      id: string; experience_id: string; status: string;
      expiry_date: string; user_id: string;
    }>(
      'SELECT id, experience_id, status, expiry_date, user_id FROM vouchers WHERE code = $1',
      [code]
    );

    if (!voucher) return res.json({ is_valid: false, error: 'Voucher code not found' });
    if (voucher.user_id !== req.user!.userId) return res.json({ is_valid: false, error: 'Voucher does not belong to your account' });
    if (voucher.status !== 'active') return res.json({ is_valid: false, error: 'Voucher has already been used or expired' });
    if (new Date(voucher.expiry_date) < new Date()) {
      await query('UPDATE vouchers SET status = $1 WHERE id = $2', ['expired', voucher.id]);
      return res.json({ is_valid: false, error: 'Voucher has expired' });
    }

    res.json({ is_valid: true, voucher_id: voucher.id, experience_id: voucher.experience_id });
  } catch (err) {
    console.error('[vouchers validate]', err);
    res.status(500).json({ error: 'Validation failed' });
  }
});

// ─── POST /vouchers/:id/redeem ────────────────────────────────────────────────
router.post('/:id/redeem', requireAuth, async (req: Request, res: Response) => {
  try {
    const { booking_date, participants = 1, special_requests } = req.body;

    const voucher = await queryOne<{
      id: string; experience_id: string; status: string;
      expiry_date: string; purchase_price: number; user_id: string;
    }>(
      'SELECT id, experience_id, status, expiry_date, purchase_price, user_id FROM vouchers WHERE id = $1',
      [req.params.id]
    );

    if (!voucher || voucher.user_id !== req.user!.userId) {
      return res.status(404).json({ error: 'Voucher not found' });
    }
    if (voucher.status !== 'active') {
      return res.status(400).json({ error: 'Voucher cannot be used' });
    }

    const booking = await queryOne<{ id: string }>(
      `INSERT INTO bookings
        (user_id, experience_id, voucher_id, booking_date, participants, total_price, payment_method, special_requests, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'voucher', $7, 'confirmed')
       RETURNING id`,
      [req.user!.userId, voucher.experience_id, voucher.id, booking_date,
       participants, voucher.purchase_price, special_requests ?? null]
    );

    await query('UPDATE vouchers SET status = $1, redemption_date = now() WHERE id = $2', ['used', voucher.id]);

    res.json({ booking_id: booking!.id, success: true });
  } catch (err) {
    console.error('[vouchers redeem]', err);
    res.status(500).json({ error: 'Redemption failed' });
  }
});

export default router;
