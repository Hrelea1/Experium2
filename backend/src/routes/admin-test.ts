import { Router, Request, Response } from 'express';
import { requireAdmin } from '../middleware/auth';
import { sendOtpEmail } from '../services/email';

const router = Router();

// POST /admin/test/email
// Triggers a test OTP email to the specified address
router.post('/email', requireAdmin, async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  console.log(`[admin-test] Manual email test triggered for: ${email}`);
  try {
    await sendOtpEmail(email, '123456', 'Admin Tester');
    res.json({ success: true, message: `Test email sent to ${email}` });
  } catch (err: any) {
    console.error(`[admin-test] Manual email test FAILED:`, err.message);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      code: err.code,
      command: err.command
    });
  }
});

export default router;
