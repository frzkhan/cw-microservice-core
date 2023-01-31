module.exports = function (config) {
  const Ioredis = require('ioredis')
  const prefix = config.service + ':'

  function dbSelection () {
    if (!process.env.NODE_ENV) {
      return 3
    }
    const env = process.env.NODE_ENV.toLowerCase()
    switch (env) {
      case 'development':
        return 3
      case 'test':
        return 1
      case 'production':
        return 7
      default:
        return 3
    }
  }

  const redis = new Ioredis(config.redis.server, config.redis.port, { keyPrefix: prefix, db: dbSelection() })

  redis.on('error', function (error) {
    console.error(error)
  })

  return redis
}
