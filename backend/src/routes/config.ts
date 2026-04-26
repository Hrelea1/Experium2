import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth';

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

router.options('/test-403', (req, res) => res.sendStatus(200));
router.get('/test-403', (req: Request, res: Response) => {
  res.status(403).json({ error: 'This is a test 403 from Express' });
});

router.get('/db-test', async (req: Request, res: Response) => {
  try {
    const { queryOne } = require('../db');
    const user = await queryOne('SELECT email, role FROM users WHERE email = $1', ['hrelea001@gmail.com']);
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/db-test-cols', async (req: Request, res: Response) => {
  try {
    const { pool } = require('../db');
    const result = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'experiences'");
    res.json(result.rows.map((r: any) => r.column_name));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /config/test-email?to=email@example.com
 * Diagnostic — sends a test email via Brevo HTTP API. Admin-only.
 */
router.get('/test-email', requireAdmin, async (req: Request, res: Response) => {
  const to = (req.query.to as string) || 'hrelea001@gmail.com';
  const fromEmail = process.env.EMAIL_FROM ?? 'contact@experium.ro';
  const apiKey = process.env.BREVO_API_KEY;

  const diagnostics: Record<string, any> = {
    mode: 'Brevo HTTP API',
    brevo_api_key_set: !!apiKey,
    email_from: fromEmail,
    to,
  };

  if (!apiKey) {
    diagnostics.result = 'SKIPPED';
    diagnostics.reason = 'BREVO_API_KEY not set';
    return res.json(diagnostics);
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': apiKey, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Experium', email: fromEmail },
        to: [{ email: to }],
        subject: `[Experium Diagnostic] Test — ${new Date().toISOString()}`,
        htmlContent: `<div style="font-family:Arial;padding:20px;"><h2>✅ Brevo API Test — SUCCESS</h2><p>Timestamp: ${new Date().toISOString()}</p></div>`,
      }),
    });
    const data = await response.json().catch(() => ({}));
    diagnostics.result = response.ok ? 'SUCCESS' : 'ERROR';
    diagnostics.http_status = response.status;
    diagnostics.brevo_response = data;
    res.status(response.ok ? 200 : 500).json(diagnostics);
  } catch (err: any) {
    diagnostics.result = 'ERROR';
    diagnostics.error = err.message;
    res.status(500).json(diagnostics);
  }
});

/**
 * GET /config/smtp-status
 * Quick diagnostic — shows email config status.
 */
router.get('/smtp-status', (req: Request, res: Response) => {
  const apiKey = process.env.BREVO_API_KEY;
  const maskStr = (s?: string): string => {
    if (!s) return '(empty)';
    if (s.length <= 6) return s[0] + '***';
    return s.slice(0, 4) + '***' + s.slice(-3);
  };

  res.json({
    mode: 'Brevo HTTP API (SMTP blocked on Railway)',
    brevo_api_key_set: !!apiKey,
    brevo_api_key: maskStr(apiKey),
    email_from: process.env.EMAIL_FROM ?? '(default: contact@experium.ro)',
    recommendation: !apiKey
      ? '⚠️ BREVO_API_KEY is missing — emails are NOT being sent! Get your API key from Brevo dashboard → SMTP & API → API Keys.'
      : '✅ Brevo API key is configured.',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /config/quick-test-email?key=experium2026&to=email@example.com
 * Sends a test email via Brevo HTTP API. Protected by simple key.
 */
router.get('/quick-test-email', async (req: Request, res: Response) => {
  if (req.query.key !== 'experium2026') {
    return res.status(403).json({ error: 'Invalid key' });
  }

  const to = (req.query.to as string) || 'hrelea001@gmail.com';
  const fromEmail = process.env.EMAIL_FROM ?? 'contact@experium.ro';
  const apiKey = process.env.BREVO_API_KEY;

  const maskStr = (s?: string): string => {
    if (!s) return '(empty)';
    if (s.length <= 6) return s[0] + '***';
    return s.slice(0, 4) + '***' + s.slice(-3);
  };

  const diagnostics: Record<string, any> = {
    mode: 'Brevo HTTP API',
    brevo_api_key_set: !!apiKey,
    brevo_api_key: maskStr(apiKey),
    email_from: fromEmail,
    to,
  };

  if (!apiKey) {
    diagnostics.result = 'SKIPPED';
    diagnostics.reason = 'BREVO_API_KEY is missing — set it in Railway env vars';
    return res.json(diagnostics);
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'Experium', email: fromEmail },
        to: [{ email: to }],
        subject: `[Experium] Test email — ${new Date().toISOString()}`,
        htmlContent: `<div style="font-family:Arial;padding:20px;">
          <h2>✅ Email Diagnostic — SUCCESS</h2>
          <p>This test email was sent via Brevo HTTP API from the Experium backend.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>From:</strong> ${fromEmail}</p>
          <p><strong>To:</strong> ${to}</p>
        </div>`,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      diagnostics.result = 'ERROR';
      diagnostics.http_status = response.status;
      diagnostics.brevo_error = data;
      return res.status(500).json(diagnostics);
    }

    diagnostics.result = 'SUCCESS';
    diagnostics.messageId = (data as any)?.messageId;
    diagnostics.brevo_response = data;
    res.json(diagnostics);
  } catch (err: any) {
    diagnostics.result = 'ERROR';
    diagnostics.error = err.message;
    res.status(500).json(diagnostics);
  }
});

export default router;
