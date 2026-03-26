import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
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
import homepageContentRoutes from './routes/homepageContent';

const app = express();
const PORT = process.env.PORT ?? 3001;

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());
const allowedOrigins = [
  'https://experium.ro',
  'https://www.experium.ro',
  'https://hrelea1.github.io',
  'http://localhost:5173',
  'http://localhost:8080',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Handle OPTIONS preflight for all routes
app.options('*', cors());

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: { error: 'Too many requests, please try again later.' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Strict limit for auth endpoints
  message: { error: 'Too many auth attempts, please try again later.' },
});

app.use(generalLimiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Static File Serving (uploads) ───────────────────────────────────────────
const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
app.use('/uploads', express.static(path.resolve(uploadDir)));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/auth', authLimiter, authRoutes);
app.use('/experiences', experienceRoutes);
app.use('/bookings', bookingRoutes);
app.use('/vouchers', voucherRoutes);
app.use('/cart', cartRoutes);
app.use('/availability', availabilityRoutes);
app.use('/admin', adminRoutes);
app.use('/admin/regions', regionRoutes);     // admin PATCH at /admin/regions/:id
app.use('/regions', regionRoutes);
app.use('/uploads', uploadRoutes);
app.use('/homepage-content', homepageContentRoutes);

// ─── Config Endpoint (replaces get-mapbox-token edge function) ────────────────
app.get('/config/mapbox-token', (req, res) => {
  const token = process.env.MAPBOX_TOKEN;
  if (!token) return res.status(500).json({ error: 'Mapbox token not configured' });
  res.json({ token });
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ERROR]', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Experium backend running at http://localhost:${PORT}`);
  console.log(`   Mode: ${process.env.NODE_ENV ?? 'development'}`);
});

export default app;
