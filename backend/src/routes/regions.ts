import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// ─── GET /regions ─────────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await query(
      `SELECT r.*,
        COUNT(e.id) FILTER (WHERE e.is_active = true) AS experience_count
       FROM regions r
       LEFT JOIN experiences e ON e.region_id = r.id
       GROUP BY r.id
       ORDER BY r.display_order ASC NULLS LAST, r.name ASC`
    );
    res.json(rows.map(r => ({ ...r, experience_count: parseInt(String(r.experience_count ?? 0)) })));
  } catch (err) {
    console.error('[regions GET /]', err);
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
});

// ─── PUT /admin/regions/:id (admin only) ──────────────────────────────────────
router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { image_url, name, display_order } = req.body;
    await query(
      `UPDATE regions SET
        image_url = COALESCE($1, image_url),
        name = COALESCE($2, name),
        display_order = COALESCE($3, display_order)
       WHERE id = $4`,
      [image_url ?? null, name ?? null, display_order ?? null, req.params.id]
    );
    res.json({ message: 'Region updated' });
  } catch (err) {
    console.error('[regions PUT /:id]', err);
    res.status(500).json({ error: 'Failed to update region' });
  }
});

export default router;
