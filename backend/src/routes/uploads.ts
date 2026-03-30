import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

const router = Router();

let storage: multer.StorageEngine;

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'experium-uploads',
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [{ width: 1200, crop: 'limit' }],
    } as any,
  });
  console.log('[Uploads] Configured Cloudinary as primary image bucket.');
} else {
  const uploadDir = path.resolve(process.env.UPLOAD_DIR ?? './uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
      cb(null, unique);
    },
  });
  console.log('[Uploads] Cloudinary keys not found. Fallback to ephemeral local storage.');
}

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

function getImageUrl(req: Request): string {
  // If Cloudinary was used, req.file.path is the remote URL
  if (req.file && (req.file as any).path && (req.file as any).path.startsWith('http')) {
    return (req.file as any).path;
  }
  
  // Local storage fallback
  const baseUrl = process.env.BACKEND_URL ?? `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/static/${req.file!.filename}`;
}

// ─── POST /uploads/experience-image ──────────────────────────────────────────
router.post('/experience-image', requireRole('admin', 'provider', 'moderator'), upload.single('image'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
      
      const imageUrl = getImageUrl(req);
      
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

    const avatarUrl = getImageUrl(req);
    await query('UPDATE profiles SET avatar_url = $1 WHERE id = $2', [avatarUrl, req.user!.userId]);

    res.json({ avatar_url: avatarUrl });
  } catch (err) {
    console.error('[uploads/avatar]', err);
    res.status(500).json({ error: 'Avatar upload failed' });
  }
});

export default router;
