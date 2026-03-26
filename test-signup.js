fetch('http://localhost:3001/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@example.com', password: 'Password12!', full_name: 'Test' })
}).then(res => res.text()).then(console.log).catch(console.error);
