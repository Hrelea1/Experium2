import 'dotenv/config';
import { sendOtpEmail } from './src/services/email';

async function test() {
  console.log('Testing sendOtpEmail via service...');
  try {
    await sendOtpEmail('hrelea001@gmail.com', '654321', 'Service Tester');
    console.log('✅ Service test SUCCESS');
  } catch (err: any) {
    console.error('❌ Service test FAILED:', err.message);
  }
}

test();
