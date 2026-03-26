import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? './uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB ?? '10', 10)) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ─── POST /uploads/experience-image ──────────────────────────────────────────
router.post('/experience-image', requireRole('admin', 'provider', 'moderator'), upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

      const { experience_id, is_primary = 'false', display_order = '0' } = req.body;
      if (!experience_id) return res.status(400).json({ error: 'experience_id required' });

      const baseUrl = process.env.APP_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
      const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

      if (is_primary === 'true') {
        // Unset previous primary
        await query('UPDATE experience_images SET is_primary = false WHERE experience_id = $1', [experience_id]);
      }

      const row = await query<{ id: string }>(
        `INSERT INTO experience_images (experience_id, image_url, is_primary, display_order)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [experience_id, imageUrl, is_primary === 'true', parseInt(display_order, 10)]
      );

      res.status(201).json({ id: row[0].id, image_url: imageUrl });
    } catch (err) {
      console.error('[uploads/experience-image]', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  }
);

// ─── POST /uploads/avatar ─────────────────────────────────────────────────────
router.post('/avatar', requireAuth, upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const baseUrl = process.env.APP_URL ?? `http://localhost:${process.env.PORT ?? 3001}`;
    const avatarUrl = `${baseUrl}/uploads/${req.file.filename}`;

    await query('UPDATE profiles SET avatar_url = $1 WHERE id = $2', [avatarUrl, req.user!.userId]);

    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    console.error('[uploads/avatar]', err);
    res.status(500).json({ error: 'Avatar upload failed' });
  }
});

export default router;
