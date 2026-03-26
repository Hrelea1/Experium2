import crypto from 'crypto';
import { query, queryOne } from '../db';

const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES ?? '10', 10);

// ─── Generate & Store OTP ─────────────────────────────────────────────────────
export async function generateAndStoreOtp(email: string): Promise<string> {
  // Delete any previous OTPs for this email
  await query('DELETE FROM registration_otps WHERE email = $1', [email]);

  // Generate cryptographically secure 6-digit code
  const otp = crypto.randomInt(100000, 999999).toString();

  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  await query(
    'INSERT INTO registration_otps (email, otp_code, expires_at) VALUES ($1, $2, $3)',
    [email, otp, expiresAt.toISOString()]
  );

  return otp;
}

// ─── Verify OTP ───────────────────────────────────────────────────────────────
export async function verifyOtp(email: string, otpCode: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM registration_otps
     WHERE email = $1 AND otp_code = $2 AND expires_at > now()
     LIMIT 1`,
    [email, otpCode]
  );

  if (!row) return false;

  // Delete after successful verification (single-use)
  await query('DELETE FROM registration_otps WHERE id = $1', [row.id]);
  return true;
}

// ─── Generate Voucher Code ────────────────────────────────────────────────────
export async function generateVoucherCode(): Promise<string> {
  let code: string;
  let exists: boolean;

  do {
    const year = new Date().getFullYear();
    const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
    code = `EXP-${year}-${rand}`;

    const row = await queryOne('SELECT 1 FROM vouchers WHERE code = $1', [code]);
    exists = row !== null;
  } while (exists);

  return code;
}
