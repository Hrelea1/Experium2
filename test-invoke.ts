import { createClient } from '@supabase/supabase-js';

const url = 'https://athadtlgfpizpvlfokuf.supabase.co';
const key = 'sb_publishable_oyaa7RwCXzpBpnq0g9Z8hg_8Y1Lj0B6';
const supabase = createClient(url, key);

async function test() {
  console.log("Invoking via Supabase JS client...");
  const { data, error } = await supabase.functions.invoke('send-notification', {
    body: { event_type: 'send_otp', email: 'test2@example.com' }
  });
  console.log("Data:", data);
  console.log("Error:", error);
}
test();
