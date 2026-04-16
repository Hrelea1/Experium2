import { Router, Request, Response } from 'express';
import { requireAuth, requireAdmin, optionalAuth, requireRole } from '../middleware/auth';
import { query, queryOne, pool } from '../db';

const router = Router();

// ─── GET /experiences ─────────────────────────────────────────────────────────
// Supports filtering by: category_slug, region_id, min_price, max_price, search, featured, limit, offset
router.get('/', optionalAuth, async (req: Request, res: Response) => {
  try {
    const {
      category_slug, region_id, county_id,
      min_price, max_price, search,
      is_featured, include_inactive, limit = '20', offset = '0',
      sort = 'created_at', order = 'DESC',
    } = req.query as Record<string, string>;

    // Admins can pass include_inactive=true to see all experiences
    const isAdmin = (req as any).user?.role === 'admin';
    const skipActiveFilter = isAdmin && include_inactive === 'true';

    const conditions: string[] = skipActiveFilter ? [] : ['e.is_active = true'];
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
        e.id, e.title, e.short_description, e.price, e.original_price, e.child_price, e.child_price_description, e.weekend_price, e.pricing_tiers,
        e.avg_rating, e.total_reviews, e.is_featured, e.is_active, e.created_at, e.google_maps_url,
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

    const formattedRows = rows.map(r => ({
      ...r,
      price: Number(r.price),
      original_price: r.original_price ? Number(r.original_price) : null,
      child_price: r.child_price ? Number(r.child_price) : null,
      child_price_description: r.child_price_description || null,
      weekend_price: r.weekend_price ? Number(r.weekend_price) : null,
      avg_rating: Number(r.avg_rating),
      total_reviews: Number(r.total_reviews),
    }));

    res.json({ data: formattedRows, total: parseInt(countResult?.count ?? '0', 10) });
  } catch (err) {
    console.error('[experiences GET /]', err);
    res.status(500).json({ error: 'Failed to fetch experiences' });
  }
});

// ─── GET /experiences/assigned (Provider/Admin) ───────────────────────────────
// Returns experiences assigned to the logged-in provider
router.get('/assigned', requireRole('provider', 'admin'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const rows = await query(
      `SELECT
        ep.id,
        ep.experience_id,
        e.title, e.short_description, e.price, e.original_price, e.child_price, e.child_price_description, e.weekend_price, e.pricing_tiers,
        e.avg_rating, e.total_reviews, e.is_featured, e.is_active, e.created_at, e.google_maps_url,
        e.provider_type,
        cat.name AS category_name, cat.slug AS category_slug, cat.icon AS category_icon,
        r.name AS region_name, r.slug AS region_slug,
        (SELECT image_url FROM experience_images WHERE experience_id = e.id AND is_primary = true LIMIT 1) AS primary_image
       FROM experience_providers ep
       JOIN experiences e ON e.id = ep.experience_id
       JOIN categories cat ON cat.id = e.category_id
       JOIN regions r ON r.id = e.region_id
       WHERE ep.provider_user_id = $1 AND ep.is_active = true
       ORDER BY e.created_at DESC`,
      [userId]
    );

    // Return shape expected by ProviderDashboard: { id, experience_id, experience: { ... } }
    const formattedRows = rows.map(r => ({
      id: r.id,                      // experience_providers.id
      experience_id: r.experience_id, // the actual experience UUID
      experience: {
        id: r.experience_id,
        title: r.title,
        short_description: r.short_description,
        location_name: r.location_name,
        price: Number(r.price),
        original_price: r.original_price ? Number(r.original_price) : null,
        child_price: r.child_price ? Number(r.child_price) : null,
        child_price_description: r.child_price_description || null,
        weekend_price: r.weekend_price ? Number(r.weekend_price) : null,
        pricing_tiers: r.pricing_tiers || [],
        provider_type: r.provider_type,
        duration_minutes: r.duration_minutes,
        max_participants: r.max_participants,
        min_participants: r.min_participants || 1,
        avg_rating: Number(r.avg_rating),
        total_reviews: Number(r.total_reviews),
        is_featured: r.is_featured,
        is_active: r.is_active,
        created_at: r.created_at,
        google_maps_url: r.google_maps_url,
        category_name: r.category_name,
        category_slug: r.category_slug,
        category_icon: r.category_icon,
        region_name: r.region_name,
        region_slug: r.region_slug,
        primary_image: r.primary_image,
      },
    }));

    res.json(formattedRows);
  } catch (err: any) {
    console.error('[experiences GET /assigned]', err);
    res.status(500).json({ error: 'Failed to fetch assigned experiences (' + (err.message || String(err)) + ')' });
  }
});

// ─── GET /experiences/:id ─────────────────────────────────────────────────────
router.get('/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const experience = await queryOne(
      `SELECT
        e.id, e.title, e.description, e.short_description, e.price, e.original_price, e.child_price, e.child_price_description, e.weekend_price, e.includes, e.pricing_tiers,
        e.category_id, e.region_id, e.county_id, e.city_id, e.location_name,
        e.duration_minutes, e.max_participants, e.min_participants, e.min_age,
        e.avg_rating, e.total_reviews, e.is_active, e.is_featured, e.google_maps_url,
        e.created_at, e.updated_at,
        ep.provider_user_id AS provider_id,
        cat.name AS category_name, cat.slug AS category_slug, cat.icon AS category_icon,
        r.name AS region_name, r.slug AS region_slug,
        co.name AS county_name,
        ci.name AS city_name,
        COALESCE(pp.is_starred, false) AS is_assisted,
        pp.phone AS provider_phone,
        pp.social_links AS provider_social_links
       FROM experiences e
       JOIN categories cat ON cat.id = e.category_id
       JOIN regions r ON r.id = e.region_id
       LEFT JOIN counties co ON co.id = e.county_id
       LEFT JOIN cities ci ON ci.id = e.city_id
       LEFT JOIN experience_providers ep ON ep.experience_id = e.id
       LEFT JOIN provider_profiles pp ON pp.user_id = ep.provider_user_id
       WHERE e.id = $1`,
      [id]
    );

    if (!experience) return res.status(404).json({ error: 'Experience not found' });

    // Wrap sub-queries in try/catch so missing tables don't crash the response
    let images: any[] = [];
    try {
      images = await query(
        `SELECT id, image_url, is_primary, display_order
         FROM experience_images WHERE experience_id = $1 ORDER BY display_order ASC`,
        [id]
      );
    } catch { /* table may not exist yet */ }

    let services: any[] = [];
    try {
      services = await query(
        `SELECT id, name, description, price, is_required, max_quantity, is_active, display_order
         FROM experience_services WHERE experience_id = $1 ORDER BY display_order ASC`,
        [id]
      );
    } catch { /* table may not exist yet */ }

    // Get provider assignment
    let providerRow: { provider_user_id: string } | null = null;
    try {
      providerRow = await queryOne<{ provider_user_id: string }>(
        `SELECT provider_user_id FROM experience_providers WHERE experience_id = $1 LIMIT 1`,
        [id]
      );
    } catch { /* table may not exist yet */ }

    const formattedExperience = {
      ...experience,
      price: Number(experience.price),
      original_price: experience.original_price ? Number(experience.original_price) : null,
      child_price: experience.child_price ? Number(experience.child_price) : null,
      child_price_description: experience.child_price_description || null,
      weekend_price: experience.weekend_price ? Number(experience.weekend_price) : null,
      avg_rating: Number(experience.avg_rating),
      total_reviews: Number(experience.total_reviews),
      is_assisted: Boolean(experience.is_assisted),
      provider_id: providerRow?.provider_user_id ?? null,
    };

    res.json({ ...formattedExperience, images, services });
  } catch (err: any) {
    console.error('[experiences GET /:id]', err);
    res.status(500).json({ error: 'Failed to fetch experience', detail: err?.message || String(err) });
  }
});

// ─── POST /experiences (Admin/Provider) ─────────────────────────────────────────
router.post('/', requireRole('admin', 'provider'), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const {
      title, description, short_description, price, original_price, child_price, child_price_description, weekend_price, includes, pricing_tiers,
      category_id, region_id, county_id, city_id, location_name, google_maps_url,
      duration_minutes, max_participants, min_participants, min_age, is_featured,
      provider_id, images, services
    } = req.body;

    // Determine provider ID (if explicitly set to "none" or null, keep it null)
    let actualProviderId = null;
    if (req.user!.role === 'admin') {
      if (provider_id && provider_id !== 'none') {
        actualProviderId = provider_id;
      }
    } else {
      actualProviderId = req.user!.userId;
    }

    await client.query('BEGIN');

    // 1. Insert experience
    const expRes = await client.query(
      `INSERT INTO experiences
        (title, description, short_description, price, original_price, child_price, child_price_description, weekend_price, includes, pricing_tiers, category_id, region_id,
         county_id, city_id, location_name, google_maps_url, duration_minutes, max_participants, min_participants, min_age, is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING id`,
      [title, description, short_description, price, original_price ?? null, child_price ?? null, child_price_description ?? null, weekend_price ?? null, includes ?? [], pricing_tiers ? JSON.stringify(pricing_tiers) : '[]', category_id, region_id,
       county_id ?? null, city_id ?? null, location_name, google_maps_url ?? null, duration_minutes ?? null,
       max_participants ?? 10, min_participants ?? 1, min_age ?? null, is_featured ?? false]
    );
    const experienceId = expRes.rows[0].id;

    // 2. Insert provider mapping
    if (actualProviderId) {
      await client.query(
        `INSERT INTO experience_providers (experience_id, provider_user_id) VALUES ($1, $2)`,
        [experienceId, actualProviderId]
      );
    }

    // 3. Insert images
    if (Array.isArray(images) && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (!img.url) continue;
        await client.query(
          `INSERT INTO experience_images (experience_id, image_url, is_primary, display_order)
           VALUES ($1, $2, $3, $4)`,
          [experienceId, img.url, img.is_primary || i === 0, img.display_order || i]
        );
      }
    }

    // 4. Insert services
    if (Array.isArray(services) && services.length > 0) {
      for (let i = 0; i < services.length; i++) {
        const svc = services[i];
        if (!svc.name || !svc.price) continue;
        await client.query(
          `INSERT INTO experience_services
            (experience_id, name, description, price, max_quantity, is_required, display_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [experienceId, svc.name, svc.description || null, svc.price, svc.max_quantity || 1, svc.is_required || false, svc.display_order || i]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ id: experienceId, message: 'Experience created' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[experiences POST]', err);
    res.status(500).json({ error: 'Failed to create experience' });
  } finally {
    client.release();
  }
});

// ─── PUT /experiences/:id (Admin/Provider) ───────────────────────────────────
router.put('/:id', requireRole('admin', 'provider'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    const allowed = ['title','description','short_description','price','original_price','child_price','child_price_description','weekend_price','includes','pricing_tiers',
      'category_id','region_id','county_id','city_id','location_name', 'google_maps_url',
      'duration_minutes','max_participants','min_participants','min_age','is_featured','is_active'];

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      if (req.user!.role !== 'admin') {
        const checkOwnership = await client.query(
          'SELECT 1 FROM experience_providers WHERE experience_id = $1 AND provider_user_id = $2',
          [id, req.user!.userId]
        );
        if (checkOwnership.rows.length === 0) {
          await client.query('ROLLBACK');
          client.release();
          return res.status(403).json({ error: 'Not authorized to edit this experience' });
        }
      }
      const updates: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      for (const key of allowed) {
        if (key in fields) {
          updates.push(`${key} = $${idx++}`);
          params.push(key === 'pricing_tiers' ? JSON.stringify(fields[key]) : fields[key]);
        }
      }

      if (updates.length > 0) {
        updates.push(`updated_at = now()`);
        params.push(id);

        await client.query(
          `UPDATE experiences SET ${updates.join(', ')} WHERE id = $${idx}`,
          params
        );
      }

      // Handle provider mapping
      if ('provider_id' in fields && req.user!.role === 'admin') {
        const providerId = fields.provider_id;
        
        // Remove existing mapping
        await client.query(`DELETE FROM experience_providers WHERE experience_id = $1`, [id]);
        
        // Insert new if not none
        if (providerId && providerId !== 'none') {
          await client.query(
            `INSERT INTO experience_providers (experience_id, provider_user_id) VALUES ($1, $2)`,
            [id, providerId]
          );
        }
      }

      // 2. Sync Images
      if ('images' in fields && Array.isArray(fields.images)) {
        await client.query(`DELETE FROM experience_images WHERE experience_id = $1`, [id]);
        for (let i = 0; i < fields.images.length; i++) {
          const img = fields.images[i];
          if (!img.image_url) continue;
          await client.query(
            `INSERT INTO experience_images (experience_id, image_url, is_primary, display_order)
             VALUES ($1, $2, $3, $4)`,
            [id, img.image_url, img.is_primary || i === 0, img.display_order || i]
          );
        }
      }

      // 3. Sync Services
      if ('services' in fields && Array.isArray(fields.services)) {
        await client.query(`DELETE FROM experience_services WHERE experience_id = $1`, [id]);
        for (let i = 0; i < fields.services.length; i++) {
          const svc = fields.services[i];
          if (!svc.name || !svc.price) continue;
          await client.query(
            `INSERT INTO experience_services
              (experience_id, name, description, price, max_quantity, is_required, display_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, svc.name, svc.description || null, svc.price, svc.max_quantity || 1, svc.is_required || false, svc.display_order || i]
          );
        }
      }

      await client.query('COMMIT');
      res.json({ message: 'Experience updated' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
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
