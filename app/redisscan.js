
// https://www.npmjs.com/package/node-redis-scan

// ONLY SCAN implemented

module.exports = function (redis) {
  const RedisScan = require('node-redis-scan')
  const redisScan = new RedisScan(redis)
  const prefix = redis.options.keyPrefix

  class RedisScanCW {
    scan (pattern, options = {}, callback) {
      if (typeof options === 'function') {
        callback = options
        options = {}
      }

      if (typeof callback === 'function') {
        return redisScan.scan(this.addPrefixToPattern(pattern), options, (err, results) => {
          return callback(err, this.removePrefixFromResult(results))
        })
      }

      return new Promise((resolve, reject) => {
        redisScan.scan(this.addPrefixToPattern(pattern), options, (err, results) => {
          if (err) {
            return reject(err)
          }
          return resolve(this.removePrefixFromResult(results))
        })
      })
    }

    addPrefixToPattern (pattern) {
      return prefix + pattern
    }

    removePrefixFromResult (results) {
      const regex = new RegExp(`^${prefix}`)
      return results.map(key => {
        return key.replace(regex, '')
      })
    }
  }

  return new RedisScanCW()
}
