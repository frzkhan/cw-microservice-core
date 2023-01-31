process.env.SUPPRESS_NO_CONFIG_WARNING = 'y'
const config = require('config')
const baseConfig = require('./config/default.js')
const Factory = require('./factory')

let instance

module.exports = function (newConfig) {
  if (instance) {
    return instance
  }
  let useConfig = baseConfig
  if (newConfig) {
    useConfig = config.util.extendDeep({}, useConfig, newConfig)
  }

  if (process.env.CONFIG_MERGE && process.env.CONFIG_MERGE.length) {
    useConfig = config.util.extendDeep({}, useConfig, JSON.parse(process.env.CONFIG_MERGE))
  }

  // process.env.NODE_CONFIG = JSON.stringify(useConfig)

  if (process.env.NODE_ENV && process.env.NODE_ENV.toLowerCase() === 'test') {
    console.log(config.util.toObject(useConfig))
  }

  instance = new Factory(useConfig)
  return instance
}
