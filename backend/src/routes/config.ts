import { Router, Request, Response } from 'express';

const router = Router();

/**
 * GET /api/config/mapbox
 * Returns the Mapbox public token for frontend map rendering.
 * Replaces the 'get-mapbox-token' Supabase edge function.
 */
router.get('/mapbox', (req: Request, res: Response) => {
  const token = process.env.MAPBOX_TOKEN || process.env.VITE_MAPBOX_TOKEN;
  
  if (!token) {
    console.warn('[Config] MAPBOX_TOKEN not set in environment.');
    return res.status(404).json({ error: 'Mapbox token not configured' });
  }

  res.json({ token });
});

export default router;
