async function test() {
  const loginRes = await fetch('http://13.233.160.230:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  const res = await fetch('http://13.233.160.230:5000/api/petitions', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Status:', res.status);
  console.log('Body:', await res.text());
}
test();
