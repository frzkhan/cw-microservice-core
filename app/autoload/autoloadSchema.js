const path = require('path')
const glob = require('glob')

module.exports = function (config) {
  const dir = path.join(config.basepath, 'modules')
  const files = glob.sync(path.join(dir, '/**/*.schema.js'), {})
  const schema = {}

  files.forEach((file) => {
    const name = path.parse(file).name.split('.')[0]
    schema[name] = require(file)
  })
  return schema
}
