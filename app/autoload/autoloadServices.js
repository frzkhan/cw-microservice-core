
const path = require('path')
const glob = require('glob')

module.exports = function (config) {
  const dir = path.join(config.basepath, 'modules')

  const files = glob.sync(path.join(dir, '/**/*.services.js'), {})

  files.forEach((file) => {
    require(file)
  })
}
