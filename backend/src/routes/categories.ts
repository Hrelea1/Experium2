import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await query(`
      SELECT c.*, COUNT(e.id) AS experience_count
      FROM categories c
      LEFT JOIN experiences e ON e.category_id = c.id AND e.is_active = true
      GROUP BY c.id
      ORDER BY c.display_order ASC NULLS LAST, c.name ASC
    `);
    res.json(rows.map(r => ({ ...r, experience_count: parseInt(String(r.experience_count ?? 0)) })));
  } catch (err) {
    console.error('[categories GET /]', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

export default router;
