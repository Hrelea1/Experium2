const testOTP = async () => {
  const url = 'https://athadtlgfpizpvlfokuf.supabase.co/functions/v1/send-notification';
  const key = 'sb_publishable_oyaa7RwCXzpBpnq0g9Z8hg_8Y1Lj0B6';

  console.log("Sending OTP request directly...");
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      event_type: 'send_otp',
      email: 'test@example.com'
    })
  });

  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Body:', text);
};
testOTP();
