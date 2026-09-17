const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: false // Don't keep retrying if Redis is not running locally
  }
});

let isConnected = false;

client.on('error', () => {
  isConnected = false;
});

client.on('connect', () => {
  isConnected = true;
  console.log('Redis connected successfully');
});

(async () => {
  try {
    await client.connect();
  } catch (err) {
    console.log('Redis not running locally - caching disabled (app will run normally)');
  }
})();

module.exports = {
  get: async (key) => {
    if (!isConnected) return null;
    try { return await client.get(key); } catch (e) { return null; }
  },
  setEx: async (key, seconds, value) => {
    if (!isConnected) return;
    try { await client.setEx(key, seconds, value); } catch (e) {}
  },
  del: async (key) => {
    if (!isConnected) return;
    try { await client.del(key); } catch (e) {}
  }
};
