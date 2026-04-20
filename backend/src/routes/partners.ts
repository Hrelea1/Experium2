import { Router, Request, Response } from 'express';
import { queryOne } from '../db';

const router = Router();

// ─── POST /partners/apply ───────────────────────────────────────────────────
router.post('/apply', async (req: Request, res: Response) => {
  try {
    const {
      full_name,
      business_name,
      email,
      phone,
      city,
      experience_type,
      description,
      website,
      gdpr_consent,
      terms_accepted,
    } = req.body;

    const result = await queryOne(`
      INSERT INTO partner_applications
      (full_name, business_name, email, phone, city, experience_type, description, website, gdpr_consent, terms_accepted)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [full_name, business_name, email, phone, city, experience_type, description, website, gdpr_consent, terms_accepted]);

    res.json({ success: true, id: result?.id });
  } catch (err) {
    console.error('[POST /partners/apply]', err);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

export default router;
