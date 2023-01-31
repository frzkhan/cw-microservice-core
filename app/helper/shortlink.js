module.exports = function (config) {
  const { rabbitmq } = require('../../index')(config)
  const shortlink = {
    async create (url, expiryDays) {
      const response = await rabbitmq.sendAndRead('/shortlinks/post', { url: url, expiryDays: expiryDays })
      return response
    },
    async fetch (key) {
      const response = await rabbitmq.sendAndRead('/shortlinks/get', { key: key })
      return response
    }
  }
  return shortlink
}
