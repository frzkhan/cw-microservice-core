const pino = require('pino')
var logInstance

module.exports = function (config) {
  function logger (obj) {
    const e = obj
    e.service = config.service
    if (e.binData) e.binData = undefined
    if (e.query && e.query.indexOf && e.query.indexOf('binData') > -1) {
      e.query = e.query.substring(0, 999)
    }
    return obj
  }
  if (!logInstance) {
    const c = { ...config.logger }
    c.customLevels = {
      alert: 500
    }
    c.formatters = { log: logger }
    const destination = pino.destination(c.destination)
    logInstance = pino(c, destination)
  }
  return logInstance
}
