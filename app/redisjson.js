
module.exports = function (redis) {
  const RedisJson = require('redis-json')
  return new RedisJson(redis)
}
