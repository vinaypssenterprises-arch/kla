const redis = require('redis');

let isConnected = false;
let client = null;

// High-speed in-memory cache fallback for when Redis is unavailable
const memoryCache = new Map();

// Periodic purge of expired memory cache keys (every 60 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [key, item] of memoryCache.entries()) {
    if (item.expiresAt && item.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
}, 60000).unref();

const withTimeout = (promise, ms = 500) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), ms))
  ]);
};

try {
  client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
      connectTimeout: 800,
      reconnectStrategy: false // Don't keep retrying if Redis is not running locally
    }
  });

  client.on('error', () => {
    isConnected = false;
  });

  (async () => {
    try {
      await withTimeout(client.connect(), 800);
      const pingReply = await withTimeout(client.ping(), 800);
      if (pingReply === 'PONG') {
        isConnected = true;
        console.log('⚡ Redis connected and active');
      } else {
        throw new Error('Redis ping failed');
      }
    } catch (err) {
      isConnected = false;
      console.log('⚡ Redis offline — Fast In-Memory caching engine active');
      try { await client.disconnect(); } catch (e) {}
    }
  })();
} catch (e) {
  isConnected = false;
  console.log('⚡ Redis init error — Fast In-Memory caching engine active');
}

module.exports = {
  get: async (key) => {
    if (isConnected && client) {
      try {
        const val = await withTimeout(client.get(key), 500);
        if (val !== null) return val;
      } catch (e) {
        isConnected = false;
      }
    }
    const item = memoryCache.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt <= Date.now()) {
      memoryCache.delete(key);
      return null;
    }
    return item.value;
  },

  setEx: async (key, seconds, value) => {
    // Save to memory cache as well for instantaneous response
    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + seconds * 1000
    });

    if (isConnected && client) {
      try {
        await withTimeout(client.setEx(key, seconds, value), 500);
      } catch (e) {
        isConnected = false;
      }
    }
  },

  del: async (key) => {
    memoryCache.delete(key);
    if (isConnected && client) {
      try {
        await withTimeout(client.del(key), 500);
      } catch (e) {
        isConnected = false;
      }
    }
  },

  delPattern: async (patternPrefix) => {
    // Delete in memory cache
    const prefix = patternPrefix.replace('*', '');
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
      }
    }

    // Delete in Redis
    if (isConnected && client) {
      try {
        const matchingKeys = await withTimeout(client.keys(prefix + '*'), 500);
        if (matchingKeys && matchingKeys.length > 0) {
          await withTimeout(client.del(matchingKeys), 500);
        }
      } catch (e) {
        isConnected = false;
      }
    }
  },

  keys: async (pattern) => {
    if (isConnected && client) {
      try {
        return (await withTimeout(client.keys(pattern), 500)) || [];
      } catch (e) {
        isConnected = false;
      }
    }
    const prefix = pattern.replace('*', '');
    return Array.from(memoryCache.keys()).filter(k => k.startsWith(prefix));
  }
};
