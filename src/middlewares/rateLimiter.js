const { redis } = require('../config/redis')

module.exports = function rateLimiter(req, res, next) {
  const userId = req.user.id
  const key = `rate_limit:${userId}`
  const max = parseInt(process.env.RATE_LIMIT_MAX) || 10
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000
  const windowSec = Math.floor(windowMs / 1000)

  Promise.resolve()
    .then(async () => {
      const current = await redis.incr(key)

      // set expiry only on first request in window
      if (current === 1) {
        await redis.expire(key, windowSec)
      }

      const ttl = await redis.ttl(key)

      res.set({
        'X-RateLimit-Limit': max,
        'X-RateLimit-Remaining': Math.max(0, max - current),
        'X-RateLimit-Reset': Math.floor(Date.now() / 1000) + ttl
      })

      if (current > max) {
        return res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `You have exceeded ${max} requests per minute.`,
            retryAfter: ttl
          }
        })
      }

      next()
    })
    .catch(next)
}