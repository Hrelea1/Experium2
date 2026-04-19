import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne } from '../db';
import { signToken, requireAuth } from '../middleware/auth';
import { generateAndStoreOtp, verifyOtp } from '../services/otp';
import { sendOtpEmail, sendPasswordResetEmail } from '../services/email';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const facebookAppId = process.env.FACEBOOK_APP_ID;

const router = Router();

// ─── POST /auth/signup ────────────────────────────────────────────────────────
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, full_name } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    // Check if already registered
    const existing = await queryOne<{ id: string }>('SELECT id FROM users WHERE email = $1', [email]);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Insert new verified user
    const userRow = await queryOne<{ id: string; email: string; full_name: string; role: string }>(
      'INSERT INTO users (email, password_hash, full_name, is_verified) VALUES ($1, $2, $3, true) RETURNING id, email, full_name, role',
      [email, passwordHash, full_name ?? null]
    );

    if (!userRow) return res.status(500).json({ error: 'Failed to create user' });

    // Ensure profile is created/updated (trigger creates it, but returning the info is enough)
    const token = signToken({ userId: userRow.id, email: userRow.email, role: userRow.role as 'user' });
    res.json({ token, user: { id: userRow.id, email: userRow.email, full_name: userRow.full_name, role: userRow.role, avatar_url: null } });
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

// ─── POST /auth/forgot-password ───────────────────────────────────────────────
// Send a password reset OTP to the user's email
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const user = await queryOne<{ full_name: string }>(
      'SELECT full_name FROM users WHERE email = $1 AND is_verified = true',
      [email]
    );

    // Always respond success to avoid email enumeration
    if (!user) {
      return res.json({ message: 'If the email exists, a reset code has been sent.' });
    }

    const otp = await generateAndStoreOtp(email);
    await sendPasswordResetEmail(email, otp, user.full_name);

    res.json({ message: 'Reset code sent to email' });
  } catch (err) {
    console.error('[auth/forgot-password]', err);
    res.status(500).json({ error: 'Failed to send reset code' });
  }
});

// ─── POST /auth/reset-password ────────────────────────────────────────────────
// Verify OTP and set a new password — then log in user directly
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, otp, new_password } = req.body;
    if (!email || !otp || !new_password) {
      return res.status(400).json({ error: 'Email, OTP and new password required' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const valid = await verifyOtp(email, otp);
    if (!valid) return res.status(400).json({ error: 'Invalid or expired OTP' });

    const hash = await bcrypt.hash(new_password, 12);
    const user = await queryOne<{ id: string; full_name: string; role: string; avatar_url: string | null }>(
      `UPDATE users SET password_hash = $1, updated_at = now()
       WHERE email = $2
       RETURNING id, full_name, role`,
      [hash, email]
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    const token = signToken({ userId: user.id, email, role: user.role as 'user' });
    res.json({
      token,
      user: { id: user.id, email, full_name: user.full_name, role: user.role, avatar_url: null },
      message: 'Password reset successfully'
    });
  } catch (err) {
    console.error('[auth/reset-password]', err);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

export default router;
