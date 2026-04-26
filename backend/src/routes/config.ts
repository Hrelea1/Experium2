import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth';
import nodemailer from 'nodemailer';

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
 * Diagnostic endpoint — sends a test email and returns detailed SMTP result.
 * Admin-only.
 */
router.get('/test-email', requireAdmin, async (req: Request, res: Response) => {
  const to = (req.query.to as string) || 'hrelea001@gmail.com';

  const smtpPort = parseInt(process.env.SMTP_PORT ?? '587', 10);
  const smtpConfig = {
    host: process.env.SMTP_HOST ?? 'smtp-relay.brevo.com',
    port: smtpPort,
    secure: process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : smtpPort === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  };

  const fromAddr = process.env.EMAIL_FROM ?? 'noreply@experium.ro';

  const diagnostics: Record<string, any> = {
    smtp_host: smtpConfig.host,
    smtp_port: smtpConfig.port,
    smtp_secure: smtpConfig.secure,
    smtp_user_set: !!smtpConfig.auth.user,
    smtp_pass_set: !!smtpConfig.auth.pass,
    email_from: fromAddr,
    to,
    isDummyEmail: !process.env.SMTP_USER || process.env.SMTP_USER === 'your@gmail.com',
  };

  try {
    const transporter = nodemailer.createTransport(smtpConfig);

    // Verify connection first
    await transporter.verify();
    diagnostics.smtp_verify = 'OK';

    const info = await transporter.sendMail({
      from: fromAddr,
      to,
      subject: `[Experium Diagnostic] Test email — ${new Date().toISOString()}`,
      html: `<div style="font-family:Arial;padding:20px;">
        <h2>✅ Email Diagnostic — SUCCESS</h2>
        <p>This test email was sent from the Experium production backend.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>SMTP Host:</strong> ${smtpConfig.host}</p>
        <p><strong>From:</strong> ${fromAddr}</p>
      </div>`,
    });

    diagnostics.result = 'SUCCESS';
    diagnostics.messageId = info.messageId;
    diagnostics.response = info.response;
    diagnostics.accepted = info.accepted;
    diagnostics.rejected = info.rejected;

    res.json(diagnostics);
  } catch (err: any) {
    diagnostics.result = 'ERROR';
    diagnostics.error = err.message;
    diagnostics.errorCode = err.code;
    diagnostics.errorCommand = err.command;
    res.status(500).json(diagnostics);
  }
});

/**
 * GET /config/smtp-status
 * Quick diagnostic — shows SMTP availability without exposing credentials.
 * Public — no auth required.
 */
router.get('/smtp-status', (req: Request, res: Response) => {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const maskStr = (s?: string): string => {
    if (!s) return '(empty)';
    if (s.length <= 6) return s[0] + '***';
    return s.slice(0, 4) + '***' + s.slice(-3);
  };

  res.json({
    smtp_host: process.env.SMTP_HOST ?? '(default: smtp-relay.brevo.com)',
    smtp_port: process.env.SMTP_PORT ?? '(default: 587)',
    smtp_secure: process.env.SMTP_SECURE ?? '(default: false)',
    smtp_user: maskStr(smtpUser),
    smtp_pass_set: !!smtpPass,
    smtp_pass_length: smtpPass?.length ?? 0,
    email_from: process.env.EMAIL_FROM ?? '(default: noreply@experium.ro)',
    isDummyEmail: !smtpUser || smtpUser === 'your@gmail.com',
    recommendation: (!smtpUser || smtpUser === 'your@gmail.com')
      ? '⚠️ SMTP_USER is missing or set to dummy value — emails are NOT being sent! Set SMTP_USER and SMTP_PASS in Railway environment variables.'
      : '✅ SMTP credentials appear to be configured.',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /config/quick-test-email?key=experium2026&to=email@example.com
 * Temporary diagnostic — sends a test email, protected by simple key.
 * REMOVE AFTER DEBUGGING.
 */
router.get('/quick-test-email', async (req: Request, res: Response) => {
  if (req.query.key !== 'experium2026') {
    return res.status(403).json({ error: 'Invalid key' });
  }

  const to = (req.query.to as string) || 'hrelea001@gmail.com';
  const fromAddr = process.env.EMAIL_FROM ?? 'noreply@experium.ro';

  const maskStr = (s?: string): string => {
    if (!s) return '(empty)';
    if (s.length <= 6) return s[0] + '***';
    return s.slice(0, 4) + '***' + s.slice(-3);
  };

  const diagnostics: Record<string, any> = {
    smtp_host: process.env.SMTP_HOST ?? '(default: smtp-relay.brevo.com)',
    smtp_port: process.env.SMTP_PORT ?? '(default: 587)',
    smtp_secure: process.env.SMTP_SECURE ?? '(default: false)',
    smtp_user: maskStr(process.env.SMTP_USER),
    smtp_pass_set: !!process.env.SMTP_PASS,
    smtp_pass_length: process.env.SMTP_PASS?.length ?? 0,
    email_from: fromAddr,
    to,
    isDummyEmail: !process.env.SMTP_USER || process.env.SMTP_USER === 'your@gmail.com',
  };

  if (diagnostics.isDummyEmail) {
    diagnostics.result = 'SKIPPED';
    diagnostics.reason = 'SMTP_USER is missing or dummy — would only log to console';
    return res.json(diagnostics);
  }

  try {
    const testPort = parseInt(process.env.SMTP_PORT ?? '587', 10);
    const testTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp-relay.brevo.com',
      port: testPort,
      secure: process.env.SMTP_SECURE !== undefined ? process.env.SMTP_SECURE === 'true' : testPort === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      tls: { rejectUnauthorized: false },
    });

    // Step 1: Verify connection
    try {
      await testTransporter.verify();
      diagnostics.smtp_verify = 'OK';
    } catch (verifyErr: any) {
      diagnostics.smtp_verify = 'FAILED';
      diagnostics.smtp_verify_error = verifyErr.message;
      diagnostics.smtp_verify_code = verifyErr.code;
      return res.status(500).json(diagnostics);
    }

    // Step 2: Send test email
    const info = await testTransporter.sendMail({
      from: fromAddr,
      to,
      subject: `[Experium] Test email — ${new Date().toISOString()}`,
      html: `<div style="font-family:Arial;padding:20px;">
        <h2>✅ Email Diagnostic — SUCCESS</h2>
        <p>This test email was sent from the Experium backend.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</p>
        <p><strong>From:</strong> ${fromAddr}</p>
        <p><strong>To:</strong> ${to}</p>
      </div>`,
    });

    diagnostics.result = 'SUCCESS';
    diagnostics.messageId = info.messageId;
    diagnostics.response = info.response;
    diagnostics.accepted = info.accepted;
    diagnostics.rejected = info.rejected;

    res.json(diagnostics);
  } catch (err: any) {
    diagnostics.result = 'ERROR';
    diagnostics.error = err.message;
    diagnostics.errorCode = err.code;
    diagnostics.errorCommand = err.command;
    diagnostics.errorResponseCode = err.responseCode;
    res.status(500).json(diagnostics);
  }
});

export default router;
