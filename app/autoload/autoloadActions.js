const path = require('path')
const glob = require('glob')

module.exports = function (config) {
  const dir = path.join(config.basepath, 'modules')
  const files = glob.sync(path.join(dir, '/**/*.actions.js'), {})
  const target = {}

  files.forEach((file) => {
    const name = path.parse(file).name.split('.')[0]
    target[name] = file
  })

  const singleton = {}

  const handler = {
    get: function (target, prop, receiver) {
      if (singleton[prop]) {
        return singleton[prop]
      }
      if (target[prop]) {
        const ActClass = require(target[prop])
        singleton[prop] = new ActClass()
        return singleton[prop]
      }
      return false
    }
  }
  return new Proxy(target, handler)
}
