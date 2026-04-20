import dotenv from 'dotenv';
dotenv.config();

import { sendOtpEmail } from './src/services/email';

async function testEmail() {
  try {
    const testEmailAddress = 'antigravity.test@example.com';
    console.log(`Sending test email to ${testEmailAddress}...`);
    await sendOtpEmail(testEmailAddress, '123456', 'Test User');
    console.log('Email sent successfully!');
  } catch (err) {
    console.error('Error sending email:', err);
  }
}

testEmail();
