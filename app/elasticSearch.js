module.exports = function (config) {
  var elasticsearch = require('elasticsearch')
  const log = require('./logger')(config).child({ name: 'elasticSearch' })
  var client = new elasticsearch.Client({
    host: config.elasticSearch.server,
    apiVersion: config.elasticSearch.version
  })

  return client.ping({
    requestTimeout: config.elasticSearch.timeout
  }).then(() => {
    log.info('Connected to elastic search')
    return client
  }).catch((error) => {
    log.alert('Unable to connect elastic search')
    log.error(error)
    return Promise.reject(error)
  })
}
