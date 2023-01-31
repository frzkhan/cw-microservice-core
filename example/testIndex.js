const config = require('config')
config.basepath = __dirname
module.exports = require('../index')(config)
