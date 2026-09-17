async function test() {
  const loginRes = await fetch('http://13.233.160.230:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' })
  });
  const token = (await loginRes.json()).token;

  const res = await fetch('http://13.233.160.230:5000/api/districts', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const dists = await res.json();
  console.log(dists.slice(0, 3));
}
test();
