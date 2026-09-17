const jwt = require('jsonwebtoken');

async function main() {
  const token = jwt.sign(
    { 
      userId: 'admin', 
      email: 'admin', 
      role: 'admin',
      districtId: null,
      isHeadOffice: true 
    }, 
    'supersecret17a'
  );

  try {
    const res = await fetch('http://localhost:5000/api/petitions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const text = await res.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch(e) {
      console.log('Failed to parse JSON:', text.slice(0, 100));
      return;
    }
    console.log('TYPE:', typeof parsed);
    console.log('IS_ARRAY:', Array.isArray(parsed));
    console.log('KEYS (if object):', typeof parsed === 'object' && !Array.isArray(parsed) ? Object.keys(parsed) : 'N/A');
    if (Array.isArray(parsed)) {
      console.log('Array length:', parsed.length);
    }
  } catch (err) {
    console.error(err);
  }
}
main();
