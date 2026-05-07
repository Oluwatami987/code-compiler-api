const { Redis } = require('ioredis')

// standard connection for caching and rate limiting
const redis = new Redis(process.env.REDIS_URL)

// BullMQ requires maxRetriesPerRequest to be null
const bullRedis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null
})

redis.on('connect', () => console.log('Redis connected'))
redis.on('error', (err) => console.error('Redis error:', err.message))

module.exports = { redis, bullRedis }