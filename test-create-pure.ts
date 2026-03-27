// run with `npx ts-node test-create-pure.ts`
const baseUrl = 'http://localhost:3001';

async function run() {
  console.log("Login...");
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hrelea001@gmail.com', password: 'password123' }) // We don't know the password
  });
  
  // Since we don't know the admin password, let's bypass auth by generating a token via the DB?
  // Let's just create an experience via the endpoint WITHOUT auth? 
  // No, POST /experiences requires Role!
}

run();
