const redis = require('redis');
async function main() {
  const client = redis.createClient({ url: 'redis://localhost:6379' });
  client.on('error', (err) => console.log('Redis error', err));
  await client.connect();
  await client.del('petitions:all');
  console.log('Cache cleared');
  await client.disconnect();
}
main();
