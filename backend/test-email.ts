import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

async function testEmail() {
  console.log('[SMTP] Init with:', {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    hasUser: !!process.env.SMTP_USER,
    hasPass: !!process.env.SMTP_PASS,
  });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM ?? 'noreply@experium.ro',
    to: 'hrelea001@gmail.com',
    subject: 'Test Diagnostic Email - Experium',
    text: 'Hello from Experium backend. This is a diagnostic test to see if emails are actually delivered.',
  };

  console.log(`Attempting to send direct email to ${mailOptions.to} from ${mailOptions.from}...`);
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('--- SUCCESS ---');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    console.log('Accepted:', info.accepted);
    console.log('Rejected:', info.rejected);
  } catch (err) {
    console.error('--- ERROR ---');
    console.error(err);
  }
}

testEmail();
