const path = require('path')
const glob = require('glob')

module.exports = function (config) {
  const dir = path.join(config.basepath, 'modules')
  const files = glob.sync(path.join(dir, '/**/*.routes.js'), {})

  return async function (fastify, opts, done) {
    files.forEach((file) => {
      const name = path.parse(file).name.split('.')[0]
      var prefix = '/' + name
      if (config.fastify.prefix) {
        prefix = config.fastify.prefix + prefix
      }
      fastify.register(require(file), { prefix })
    })
    done()
  }
}
