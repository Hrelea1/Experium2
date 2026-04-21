import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';

// Routes
import authRoutes from './routes/auth';
import experienceRoutes from './routes/experiences';
import bookingRoutes from './routes/bookings';
import voucherRoutes from './routes/vouchers';
import cartRoutes from './routes/cart';
import availabilityRoutes from './routes/availability';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/uploads';
import regionRoutes from './routes/regions';
import categoryRoutes from './routes/categories';
import homepageContentRoutes from './routes/homepageContent';
import notificationRoutes from './routes/notifications';
import checkoutRoutes from './routes/checkout';
import configRoutes from './routes/config';
import reviewRoutes from './routes/reviews';
import blogRoutes from './routes/blog';
import partnerRoutes from './routes/partners';
import newsletterRoutes from './routes/newsletter';

const app = express();
const PORT = process.env.PORT ?? 3001;

// Trust Railway/cloud proxy
app.set('trust proxy', 1);

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.options('*', cors());

// ─── Security Headers ─────────────────────────────────────────────────────────
// Removed COOP/COEP headers because they block Google OAuth popup postMessage
// when set indiscriminately on all JSON API responses in Chromium browsers.

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Static File Serving (uploads) ───────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
app.use('/static', express.static(path.resolve(uploadDir)));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/experiences', experienceRoutes);
app.use('/bookings', bookingRoutes);
app.use('/vouchers', voucherRoutes);
app.use('/cart', cartRoutes);
app.use('/availability', availabilityRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/regions', regionRoutes);
app.use('/regions', regionRoutes);
app.use('/categories', categoryRoutes);
app.use('/uploads', uploadRoutes);
app.use('/homepage-content', homepageContentRoutes);
app.use('/notifications', notificationRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/config', configRoutes);
app.use('/reviews', reviewRoutes);
app.use('/blog', blogRoutes);
app.use('/partners', partnerRoutes);
app.use('/newsletter', newsletterRoutes);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── POST test (to diagnose Railway proxy issues) ─────────────────────────────
app.post('/ping', (_req, res) => {
  res.json({ pong: true, received: new Date().toISOString() });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ error: err.message ?? 'Internal server error' });
});

// ─── Auto-migrate on startup ──────────────────────────────────────────────────
import fs from 'fs';
import { pool } from './db';

async function migrate() {
  try {
    // __dirname is /app/dist/ → schema is at /app/db/schema.sql (one level up, not two)
    const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
    console.log('[DB] Running schema from:', schemaPath);
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await pool.query(sql);
    console.log('[DB] ✅ Schema applied (auto-migrate)');
    
    // Run the ALTER TABLE commands for existing tables
    const { testConnection } = require('./db');
    await testConnection();
    
  } catch (err: any) {
    console.error('[DB] ⚠️ Auto-migrate error:', err.message);
  }
}

// Start listening IMMEDIATELY so Railway health checks pass
app.listen(PORT, () => {
  console.log(`✅ Experium backend running at http://localhost:${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV ?? 'development'}`);
});

// Run migration immediately in background (no delay)
migrate().catch(console.error);



export default app;
