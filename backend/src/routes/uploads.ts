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

      const baseUrl = process.env.BACKEND_URL ?? `${req.protocol}://${req.get('host')}`;
      const imageUrl = `${baseUrl}/static/${req.file.filename}`;

      // Decoupled from DB: Just return the URL to the frontend
      res.status(201).json({ image_url: imageUrl });
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

    const baseUrl = process.env.BACKEND_URL ?? `${req.protocol}://${req.get('host')}`;
    const avatarUrl = `${baseUrl}/static/${req.file.filename}`;

    await query('UPDATE profiles SET avatar_url = $1 WHERE id = $2', [avatarUrl, req.user!.userId]);

    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    console.error('[uploads/avatar]', err);
    res.status(500).json({ error: 'Avatar upload failed' });
  }
});

export default router;
