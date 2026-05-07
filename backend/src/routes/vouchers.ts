import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAuth } from '../middleware/auth';
import { generateVoucherCode } from '../services/otp';
import { sendProviderVoucherNotification, sendBookingConfirmation, sendProviderBookingNotification } from '../services/email';

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

    // Get client info and notify providers
    queryOne<{ full_name: string }>(
      `SELECT full_name FROM profiles WHERE id = $1`,
      [req.user!.userId]
    ).then(clientProfile => {
      const clientName = clientProfile?.full_name ?? 'Client';

      // Notify providers
      query<{ email: string; full_name: string; title: string }>(
        `SELECT u.email, p.full_name, e.title
         FROM experience_providers ep
         JOIN users u ON u.id = ep.provider_user_id
         LEFT JOIN profiles p ON p.id = u.id
         JOIN experiences e ON e.id = ep.experience_id
         WHERE ep.experience_id = $1 AND ep.is_active = true`,
        [experience_id]
      ).then(async (providers) => {
        for (const provider of providers) {
          if (provider.email) {
            await sendProviderVoucherNotification({
              providerEmail: provider.email,
              providerName: provider.full_name ?? 'Furnizor',
              experienceTitle: provider.title,
              clientName,
              purchasePrice: Number(purchase_price),
            });
          }
        }
      }).catch(err => console.error('[Provider Voucher Notification]', err));
    }).catch(console.error);

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

    // Send emails for the new booking (Client & Provider)
    queryOne<{ email: string; full_name: string; title: string; phone: string | null }>(
      `SELECT u.email, p.full_name, p.phone, e.title
       FROM users u
       LEFT JOIN profiles p ON p.id = u.id
       JOIN experiences e ON e.id = $2
       WHERE u.id = $1`,
      [req.user!.userId, voucher.experience_id]
    ).then(async (info) => {
      if (info) {
        await sendBookingConfirmation({
          email: info.email,
          name: info.full_name ?? 'Client',
          experienceTitle: info.title,
          bookingDate: new Date(booking_date).toLocaleString('ro-RO'),
          participants: Number(participants),
          totalPrice: Number(voucher.purchase_price),
          bookingId: booking!.id,
        });

        // Notify providers
        query<{ email: string; full_name: string }>(
          `SELECT u.email, p.full_name
           FROM experience_providers ep
           JOIN users u ON u.id = ep.provider_user_id
           LEFT JOIN profiles p ON p.id = u.id
           WHERE ep.experience_id = $1 AND ep.is_active = true`,
          [voucher.experience_id]
        ).then(async (providers) => {
          for (const provider of providers) {
            if (provider.email) {
              await sendProviderBookingNotification({
                providerEmail: provider.email,
                providerName: provider.full_name ?? 'Furnizor',
                experienceTitle: info.title,
                clientName: info.full_name ?? 'Client',
                clientEmail: info.email,
                bookingDate: new Date(booking_date).toLocaleString('ro-RO'),
                participants: Number(participants),
                totalPrice: Number(voucher.purchase_price),
                bookingId: booking!.id,
              });
            }
          }
        }).catch(err => console.error('[Provider Notification]', err));
      }
    }).catch(console.error);

    res.json({ booking_id: booking!.id, success: true });
  } catch (err) {
    console.error('[vouchers redeem]', err);
    res.status(500).json({ error: 'Redemption failed' });
  }
});

export default router;
