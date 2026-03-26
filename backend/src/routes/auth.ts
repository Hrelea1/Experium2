import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../db';
import { signToken, requireAuth } from '../middleware/auth';
import { generateAndStoreOtp, verifyOtp } from '../services/otp';
import { sendOtpEmail } from '../services/email';

const router = Router();

// ─── POST /auth/signup ────────────────────────────────────────────────────────
// Step 1 of signup: store pending user, send OTP
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    // Check if already registered and verified
    const existing = await queryOne<{ id: string; is_verified: boolean }>(
      'SELECT id, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (existing?.is_verified) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    if (existing && !existing.is_verified) {
      // Update the pending user
      await query('UPDATE users SET password_hash = $1, full_name = $2 WHERE email = $3', [
        passwordHash, full_name ?? null, email,
      ]);
    } else {
      // Insert new pending user
      await query(
        'INSERT INTO users (email, password_hash, full_name, is_verified) VALUES ($1, $2, $3, false)',
        [email, passwordHash, full_name ?? null]
      );
    }

    const otp = await generateAndStoreOtp(email);
    try {
      await sendOtpEmail(email, otp, full_name);
    } catch (emailErr: any) {
      console.error('[auth/signup] Email send failed:', emailErr.message);
      return res.status(500).json({
        error: `Contul a fost creat dar emailul OTP nu a putut fi trimis: ${emailErr.message}. Verificați configurarea SMTP.`
      });
    }

    res.json({ message: 'OTP sent to email' });
  } catch (err) {
    console.error('[auth/signup]', err);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// ─── POST /auth/verify-otp ────────────────────────────────────────────────────
// Step 2 of signup: verify OTP and activate account
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    const valid = await verifyOtp(email, otp);
    if (!valid) return res.status(400).json({ error: 'Invalid or expired OTP' });

    // Mark user as verified
    const user = await queryOne<{ id: string; full_name: string; role: string }>(
      `UPDATE users SET is_verified = true, updated_at = now()
       WHERE email = $1 RETURNING id, full_name, role`,
      [email]
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Create profile entry if it doesn't exist
    await query(
      `INSERT INTO profiles (id, email, full_name) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [user.id, email, user.full_name]
    );

    const token = signToken({ userId: user.id, email, role: user.role as 'user' });
    res.json({ token, user: { id: user.id, email, full_name: user.full_name, role: user.role } });
  } catch (err) {
    console.error('[auth/verify-otp]', err);
    res.status(500).json({ error: 'OTP verification failed' });
  }
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await queryOne<{
      id: string; password_hash: string; full_name: string;
      role: string; is_verified: boolean; avatar_url: string | null;
    }>(
      `SELECT u.id, u.password_hash, u.full_name, u.role, u.is_verified,
              p.avatar_url
       FROM users u
       LEFT JOIN profiles p ON p.id = u.id
       WHERE u.email = $1`,
      [email]
    );

    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.is_verified) return res.status(403).json({ error: 'Email not verified. Check your inbox for the OTP.' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken({ userId: user.id, email, role: user.role as 'user' });
    res.json({
      token,
      user: { id: user.id, email, full_name: user.full_name, role: user.role, avatar_url: user.avatar_url ?? null },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── POST /auth/otp/send ──────────────────────────────────────────────────────
// Send login OTP (passwordless login or 2FA)
router.post('/otp/send', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await queryOne<{ full_name: string }>(
      'SELECT full_name FROM users WHERE email = $1 AND is_verified = true',
      [email]
    );
    if (!user) return res.status(404).json({ error: 'No verified account found for this email' });

    const otp = await generateAndStoreOtp(email);
    await sendOtpEmail(email, otp, user.full_name);
    res.json({ message: 'OTP sent' });
  } catch (err) {
    console.error('[auth/otp/send]', err);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// ─── POST /auth/otp/login ─────────────────────────────────────────────────────
// Passwordless login with OTP
router.post('/otp/login', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    const valid = await verifyOtp(email, otp);
    if (!valid) return res.status(400).json({ error: 'Invalid or expired OTP' });

    const user = await queryOne<{ id: string; full_name: string; role: string; avatar_url: string }>(
      'SELECT id, full_name, role, avatar_url FROM users WHERE email = $1',
      [email]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = signToken({ userId: user.id, email, role: user.role as 'user' });
    res.json({ token, user: { id: user.id, email, full_name: user.full_name, role: user.role, avatar_url: user.avatar_url } });
  } catch (err) {
    console.error('[auth/otp/login]', err);
    res.status(500).json({ error: 'OTP login failed' });
  }
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────
// JWT is stateless; just return success. Client removes the token.
router.post('/logout', requireAuth, (req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await queryOne<{ id: string; email: string; full_name: string; role: string; avatar_url: string; phone: string }>(
      'SELECT u.id, u.email, u.full_name, u.role, p.avatar_url, p.phone FROM users u LEFT JOIN profiles p ON p.id = u.id WHERE u.id = $1',
      [req.user!.userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('[auth/me]', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ─── PUT /auth/me ─────────────────────────────────────────────────────────────
router.put('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const { full_name, phone, avatar_url } = req.body;
    await query(
      `UPDATE profiles SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone), avatar_url = COALESCE($3, avatar_url), updated_at = now()
       WHERE id = $4`,
      [full_name ?? null, phone ?? null, avatar_url ?? null, req.user!.userId]
    );
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error('[auth/me PUT]', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

// ─── POST /auth/change-password ───────────────────────────────────────────────
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });

    const user = await queryOne<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user!.userId]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const match = await bcrypt.compare(current_password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Current password incorrect' });

    const hash = await bcrypt.hash(new_password, 12);
    await query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [hash, req.user!.userId]);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('[auth/change-password]', err);
    res.status(500).json({ error: 'Password change failed' });
  }
});

export default router;
