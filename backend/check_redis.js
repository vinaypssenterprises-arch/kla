const redis = require('redis');
const client = redis.createClient({ url: 'redis://localhost:6379' });
client.connect().then(async () => {
  const data = await client.get('petitions:all');
  console.log('Redis cache for petitions:all:', data);
  process.exit(0);
});
