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


/**
 * GET /config/test-email?to=email@example.com
 * Diagnostic endpoint — sends a test email and returns detailed SMTP result.
 * Admin-only.
 */
router.get('/test-email', requireAdmin, async (req: Request, res: Response) => {
  const to = (req.query.to as string) || 'hrelea001@gmail.com';

  const smtpConfig = {
    host: process.env.SMTP_HOST ?? 'smtp.zoho.eu',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
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

export default router;
