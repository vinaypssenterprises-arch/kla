async function test() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  try {
    const [petitionsRes, districtsRes] = await Promise.all([
      fetch('http://localhost:5000/api/petitions', { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch('http://localhost:5000/api/districts', { headers: { 'Authorization': `Bearer ${token}` } })
    ]);
    
    console.log('petitions ok:', petitionsRes.ok);
    console.log('districts ok:', districtsRes.ok);
    
    if (!petitionsRes.ok) console.log(await petitionsRes.text());
    if (!districtsRes.ok) console.log(await districtsRes.text());
  } catch (err) {
    console.error('Error in Promise.all:', err);
  }
}
test();
