module.exports = function (config) {
  const mongoose = require('mongoose')
  const { envPrefix } = require('../index')(config)
  const { Schema } = require('mongoose')

  mongoose.Promise = global.Promise

  Schema.prototype.addESPlugin = function (plugin, options) {
    if (plugin && plugin.name === 'Mongoosastic') {
      options.index = envPrefix + this.base._pluralize(options.index)
      this.plugin(plugin, options)
    } else {
      this.plugin(plugin, options)
    }
  }

  const log = require('./logger')(config).child({ name: 'mongoose' })
  const ret = {}

  if (config && config.mongodb && config.mongodb.active && config.mongodb.databases.length) {
    for (let i = 0; i < config.mongodb.databases.length; i++) {
      const el = config.mongodb.databases[i]
      const mongo = new mongoose.Mongoose()
      mongo.set('useCreateIndex', true)
      mongo.set('useNewUrlParser', true)
      mongo.set('useUnifiedTopology', true)
      if (config.mongodb.debug) {
        const customlog = require('./logger')(config).child({ name: 'Mongoose', db: el.name })
        mongo.set('debug', function (coll, method, query, doc, options) {
          customlog.debug({
            query: serializer({ coll, method, query, doc, options })
          })
        })
      }

      mongo.connect('mongodb://' + config.mongodb.server + (config.mongodb.port && config.mongodb.port.length > 0 ? ':' + config.mongodb.port : '') + '/' + envPrefix + el.db, el.options)
      mongo.connection.on('error', (err) => {
        log.alert('Mongoose database error')
        log.error(err)
        mongo.disconnect()
      })
      mongo.connection.on('disconnected', (err) => {
        log.alert('Reconnecting mongo db')
        log.error(err)
        mongo.connect('mongodb://' + config.mongodb.server + (config.mongodb.port && config.mongodb.port.length > 0 ? ':' + config.mongodb.port : '') + '/' + envPrefix + el.db, el.options)
      })
      ret[el.name] = mongo
    }
  }
  return ret
}

function serializer (data) {
  const query = JSON.stringify(data.query)
  const options = JSON.stringify(data.options || {})
  return `db.${data.coll}.${data.method}(${query}, ${options});`
}
