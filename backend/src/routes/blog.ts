import { Router, Request, Response } from 'express';
import { requireAdmin, optionalAuth } from '../middleware/auth';
import { query, queryOne } from '../db';

const router = Router();

// ─── GET /blog/categories ───────────────────────────────────────────────────
router.get('/categories', optionalAuth, async (req: Request, res: Response) => {
  try {
    const categories = await query('SELECT * FROM blog_categories ORDER BY display_order ASC, name ASC');
    res.json(categories);
  } catch (err) {
    console.error('[GET /blog/categories]', err);
    res.status(500).json({ error: 'Failed to fetch blog categories' });
  }
});

// ─── GET /blog/posts ────────────────────────────────────────────────────────
router.get('/posts', optionalAuth, async (req: Request, res: Response) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const conditions = isAdmin ? [] : ["status = 'published'"];
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const posts = await query(`
      SELECT bp.*, bc.name as category_name
      FROM blog_posts bp
      LEFT JOIN blog_categories bc ON bc.id = bp.category_id
      ${whereClause}
      ORDER BY bp.created_at DESC
    `);
    res.json(posts);
  } catch (err) {
    console.error('[GET /blog/posts]', err);
    res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// ─── GET /blog/posts/:id ────────────────────────────────────────────────────
router.get('/posts/:id', optionalAuth, async (req: Request, res: Response) => {
  try {
    // If id is UUID use id, else use slug
    const isUiid = req.params.id.includes('-');
    const condition = isUiid ? 'id = $1' : 'slug = $1';
    
    const post = await queryOne(`SELECT * FROM blog_posts WHERE ${condition}`, [req.params.id]);
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Only admin can see non-published
    if (post.status !== 'published' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    res.json(post);
  } catch (err) {
    console.error('[GET /blog/posts/:id]', err);
    res.status(500).json({ error: 'Failed to fetch blog post' });
  }
});

// ─── POST /blog/posts ───────────────────────────────────────────────────────
router.post('/posts', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, slug, meta_title, meta_description, featured_image, content, author, category_id, tags, status, published_at } = req.body;
    const result = await queryOne(`
      INSERT INTO blog_posts
      (title, slug, meta_title, meta_description, featured_image, content, author, category_id, tags, status, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [title, slug, meta_title, meta_description, featured_image, content, author, category_id, tags, status, published_at]);
    res.json({ success: true, id: result?.id });
  } catch (err) {
    console.error('[POST /blog/posts]', err);
    res.status(500).json({ error: 'Failed to create blog post' });
  }
});

// ─── PUT /blog/posts/:id ────────────────────────────────────────────────────
router.put('/posts/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { title, slug, meta_title, meta_description, featured_image, content, author, category_id, tags, status, published_at } = req.body;
    
    const updates = [];
    const params = [];
    let idx = 1;

    for (const [k, v] of Object.entries(req.body)) {
      if (v !== undefined) {
        updates.push(`${k} = $${idx++}`);
        params.push(v);
      }
    }
    
    if (updates.length > 0) {
      params.push(req.params.id);
      await query(`UPDATE blog_posts SET ${updates.join(', ')} WHERE id = $${idx}`, params);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('[PUT /blog/posts/:id]', err);
    res.status(500).json({ error: 'Failed to update blog post' });
  }
});

// ─── DELETE /blog/posts/:id ─────────────────────────────────────────────────
router.delete('/posts/:id', requireAdmin, async (req: Request, res: Response) => {
  try {
    await query('DELETE FROM blog_posts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[DELETE /blog/posts/:id]', err);
    res.status(500).json({ error: 'Failed to delete blog post' });
  }
});

export default router;
