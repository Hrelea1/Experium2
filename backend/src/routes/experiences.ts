import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db';
import { requireAuth, requireAdmin, optionalAuth } from '../middleware/auth';

const router = Router();

// ─── GET /experiences ─────────────────────────────────────────────────────────
// Supports filtering by: category_slug, region_id, min_price, max_price, search, featured, limit, offset
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const {
      category_slug, region_id, county_id,
      min_price, max_price, search,
      is_featured, limit = '20', offset = '0',
      sort = 'created_at', order = 'DESC',
    } = req.query as Record<string, string>;

    const conditions: string[] = ['e.is_active = true'];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (category_slug) {
      conditions.push(`cat.slug = $${paramIdx++}`);
      params.push(category_slug);
    }
    if (region_id) {
      conditions.push(`e.region_id = $${paramIdx++}`);
      params.push(region_id);
    }
    if (county_id) {
      conditions.push(`e.county_id = $${paramIdx++}`);
      params.push(county_id);
    }
    if (min_price) {
      conditions.push(`e.price >= $${paramIdx++}`);
      params.push(parseFloat(min_price));
    }
    if (max_price) {
      conditions.push(`e.price <= $${paramIdx++}`);
      params.push(parseFloat(max_price));
    }
    if (is_featured === 'true') {
      conditions.push(`e.is_featured = true`);
    }
    if (search) {
      conditions.push(`(e.title ILIKE $${paramIdx} OR e.description ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const allowedSorts: Record<string, string> = {
      price: 'e.price', rating: 'e.avg_rating', created_at: 'e.created_at',
    };
    const sortColumn = allowedSorts[sort] ?? 'e.created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const rows = await query(
      `SELECT
        e.id, e.title, e.short_description, e.price, e.original_price,
        e.location_name, e.duration_minutes, e.max_participants,
        e.avg_rating, e.total_reviews, e.is_featured, e.created_at,
        cat.name AS category_name, cat.slug AS category_slug, cat.icon AS category_icon,
        r.name AS region_name, r.slug AS region_slug,
        (SELECT image_url FROM experience_images WHERE experience_id = e.id AND is_primary = true LIMIT 1) AS primary_image
       FROM experiences e
       JOIN categories cat ON cat.id = e.category_id
       JOIN regions r ON r.id = e.region_id
       ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      params
    );

    // Total count for pagination
    const countParams = params.slice(0, -2);
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) AS count FROM experiences e
       JOIN categories cat ON cat.id = e.category_id
       JOIN regions r ON r.id = e.region_id
       ${whereClause}`,
      countParams
    );

    res.json({ data: rows, total: parseInt(countResult?.count ?? '0', 10) });
  } catch (err) {
    console.error('[experiences GET /]', err);
    res.status(500).json({ error: 'Failed to fetch experiences' });
  }
});

// ─── GET /experiences/:id ─────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const experience = await queryOne(
      `SELECT
        e.*,
        cat.name AS category_name, cat.slug AS category_slug, cat.icon AS category_icon,
        r.name AS region_name, r.slug AS region_slug,
        co.name AS county_name,
        ci.name AS city_name
       FROM experiences e
       JOIN categories cat ON cat.id = e.category_id
       JOIN regions r ON r.id = e.region_id
       LEFT JOIN counties co ON co.id = e.county_id
       LEFT JOIN cities ci ON ci.id = e.city_id
       WHERE e.id = $1 AND e.is_active = true`,
      [id]
    );

    if (!experience) return res.status(404).json({ error: 'Experience not found' });

    const images = await query(
      `SELECT id, image_url, is_primary, display_order
       FROM experience_images WHERE experience_id = $1 ORDER BY display_order ASC`,
      [id]
    );

    res.json({ ...experience, images });
  } catch (err) {
    console.error('[experiences GET /:id]', err);
    res.status(500).json({ error: 'Failed to fetch experience' });
  }
});

// ─── POST /experiences (Admin only) ──────────────────────────────────────────
router.post('/', requireAdmin, async (req: Request, res: Response) => {
  try {
    const {
      title, description, short_description, price, original_price,
      category_id, region_id, county_id, city_id, location_name,
      duration_minutes, max_participants, min_age, is_featured,
    } = req.body;

    const row = await queryOne<{ id: string }>(
      `INSERT INTO experiences
        (title, description, short_description, price, original_price, category_id, region_id,
         county_id, city_id, location_name, duration_minutes, max_participants, min_age, is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [title, description, short_description, price, original_price ?? null, category_id, region_id,
       county_id ?? null, city_id ?? null, location_name, duration_minutes ?? null,
       max_participants ?? 10, min_age ?? null, is_featured ?? false]
    );

    res.status(201).json({ id: row!.id, message: 'Experience created' });
  } catch (err) {
    console.error('[experiences POST]', err);
    res.status(500).json({ error: 'Failed to create experience' });
  }
});

// ─── PUT /experiences/:id (Admin only) ───────────────────────────────────────
router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    const allowed = ['title','description','short_description','price','original_price',
      'category_id','region_id','county_id','city_id','location_name',
      'duration_minutes','max_participants','min_age','is_featured','is_active'];

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    for (const key of allowed) {
      if (key in fields) {
        updates.push(`${key} = $${idx++}`);
        params.push(fields[key]);
      }
    }

    if (!updates.length) return res.status(400).json({ error: 'No valid fields to update' });
    updates.push(`updated_at = now()`);
    params.push(id);

    await query(
      `UPDATE experiences SET ${updates.join(', ')} WHERE id = $${idx}`,
      params
    );
    res.json({ message: 'Experience updated' });
  } catch (err) {
    console.error('[experiences PUT /:id]', err);
    res.status(500).json({ error: 'Failed to update experience' });
  }
});

// ─── DELETE /experiences/:id (Admin only) ────────────────────────────────────
router.delete('/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await query('UPDATE experiences SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Experience deactivated' });
  } catch (err) {
    console.error('[experiences DELETE /:id]', err);
    res.status(500).json({ error: 'Failed to deactivate experience' });
  }
});

export default router;
