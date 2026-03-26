import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAdmin } from '../middleware/auth';

const router = Router();

// ─── GET /homepage-content ───────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await query('SELECT * FROM homepage_content ORDER BY section_key');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch homepage content' });
  }
});

// ─── GET /homepage-content/:key ──────────────────────────────────────────────
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const row = await queryOne(
      'SELECT * FROM homepage_content WHERE section_key = $1',
      [req.params.key]
    );
    // Return empty content instead of 404 — frontend handles missing sections gracefully
    res.json(row ?? { section_key: req.params.key, content: {} });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch content section' });
  }
});

// ─── PUT /homepage-content/:key (Admin) ──────────────────────────────────────
router.put('/:key', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    const row = await queryOne(
      `INSERT INTO homepage_content (section_key, content)
       VALUES ($1, $2)
       ON CONFLICT (section_key) DO UPDATE SET content = $2, updated_at = now()
       RETURNING *`,
      [req.params.key, JSON.stringify(content)]
    );
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update content' });
  }
});

export default router;
