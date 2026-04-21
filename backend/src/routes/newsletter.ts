import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { sendNewsletterWelcome } from '../services/email';

const router = Router();

// POST /newsletter/subscribe
router.post('/subscribe', async (req: Request, res: Response) => {
  const { email, gdpr_consent } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email invalid.' });
  }
  if (!gdpr_consent) {
    return res.status(400).json({ error: 'Consimțământul GDPR este obligatoriu.' });
  }

  try {
    // Insert into newsletter_subscribers (via Supabase DB direct connection)
    await pool.query(
      `INSERT INTO newsletter_subscribers (email, gdpr_consent, gdpr_consent_date, segment)
       VALUES ($1, true, NOW(), 'general')
       ON CONFLICT (email) DO NOTHING`,
      [email.toLowerCase().trim()]
    );

    // Send welcome email (non-blocking — don't fail if email fails)
    sendNewsletterWelcome(email.toLowerCase().trim()).catch((err) => {
      console.error('[Newsletter] Failed to send welcome email:', err.message);
    });

    return res.json({ success: true });
  } catch (err: any) {
    console.error('[Newsletter] Subscribe error:', err.message);
    return res.status(500).json({ error: 'Eroare la înregistrare. Încearcă din nou.' });
  }
});

export default router;
