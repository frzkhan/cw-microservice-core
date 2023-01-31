const fs = require('fs')
const path = require('path')

const CW_DOMAIN = 'cowellness.net'

const singleton = {
  fastify: undefined,
  mongodb: undefined,
  rabbitmq: undefined,
  redis: undefined,
  redisJson: undefined,
  redisScan: undefined,
  logger: undefined,
  ctr: undefined,
  esPromise: undefined,
  email: undefined,
  token: undefined,
  act: undefined,
  schema: undefined,
  auth: undefined,
  util: undefined
}

async function fastifyInstance (config) {
  if (singleton.fastify) {
    return singleton.fastify
  }
  var fastify = require('./app/fastify.js')
  singleton.fastify = await fastify(config)
  return singleton.fastify
}

async function authInstance (config) {
  if (singleton.auth) return singleton.auth

  singleton.auth = require('./app/helper/auth')(config)
  return singleton.auth
}

function mongDBInstance (config) {
  if (singleton.mongodb) {
    return singleton.mongodb
  }
  singleton.mongodb = require('./app/mongodb.js')(config)
  return singleton.mongodb
}

async function esInstance (config) {
  if (singleton.es) {
    return singleton.es
  }
  if (!singleton.esPromise) {
    singleton.esPromise = require('./app/elasticSearch')(config)
  }
  singleton.es = await singleton.esPromise
  return singleton.es
}

function rabbitMQInstance (config) {
  if (singleton.rabbitmq) {
    return singleton.rabbitmq
  }
  const Rabbitmq = require('./app/rabbitmq')
  singleton.rabbitmq = new Rabbitmq(config)
  return singleton.rabbitmq
}

function redisInstance (config) {
  if (singleton.redis) {
    return singleton.redis
  }
  singleton.redis = require('./app/redis')(config)
  return singleton.redis
}

function redisJSONInstance (redis, config) {
  if (singleton.redisJson) {
    return singleton.redisJson
  }
  singleton.redisJson = require('./app/redisjson')(redis)
  return singleton.redisJson
}

function redisScanInstance (redis, config) {
  if (singleton.redisScan) {
    return singleton.redisScan
  }
  singleton.redisScan = require('./app/redisscan')(redis)
  return singleton.redisScan
}

function controllerInstance (config) {
  if (singleton.ctr) {
    return singleton.ctr
  }
  singleton.ctr = require('./app/autoload/autoloadControllers.js')(config)
  return singleton.ctr
}

function actionInstance (config) {
  if (singleton.act) {
    return singleton.act
  }
  singleton.act = require('./app/autoload/autoloadActions.js')(config)
  return singleton.act
}

function schemaInstance (config) {
  if (singleton.schema) {
    return singleton.schema
  }
  singleton.schema = require('./app/autoload/autoloadSchema.js')(config)
  return singleton.schema
}

/**
 * Factory class
 * @class
 */
class Factory {
  constructor (config) {
    this.config = config || {}
  }

  /**
   * Autoload models and start fastify server
   *
   * @returns fastify
   */
  async startFastify (isSilent) {
    if ((this.config.fastify && this.config.fastify.active) || (fs.existsSync(path.join(this.config.basepath, '..', 'public')))) {
      this.config.fastify.active = true
      return await fastifyInstance(this.config)
    } else {
      if (!isSilent) this.log.alert('Fastify is not active')
      return undefined
    }
  }

  /**
   * Autoload actions / schema and start rabbitmq consume
   */
  startActions () {
    if (this.config.rabbitmq.active) {
      actionInstance(this.config)
      schemaInstance(this.config)
      require('./app/actions')(this.config)
    }
  }

  async startES (isSilent) {
    if (this.config && this.config.elasticSearch && this.config.elasticSearch.active) {
      return await esInstance(this.config)
    } else {
      if (!isSilent) this.log.alert('ElasticSearch is not active')
      return undefined
    }
  }

  /**
   * Start all the service which are marked active in configuration
   *
   * @returns fastify
   */
  autoStart () {
    return Promise.all([
      this.ctr,
      this.redisJson,
      this.redisScan,
      this.rabbitmq,
      this.mongodb,
      this.startES(true),
      this.startFastify(true),
      this.startActions()
    ])
      .then(() => this.autoloadFiles())
      .then(() => this)
  }

  /**
  * Stop all the service which are marked active in configuration
  *
  * @returns fastify
  */
  async autoStop () {
    return Promise.all([
      this.stopRedis(),
      this.stopRabbitmq(),
      this.stopMongodb(),
      this.stopES(),
      this.stopFastify()
    ])
  }

  /**
   * Stop fastify server listenting
   */
  async stopFastify () {
    if (singleton.fastify) {
      await singleton.fastify.close()
      singleton.fastify = null
    }
  }

  /**
   * Api Server instance
   */
  get fastify () {
    return singleton.fastify
  }

  /**
   * Lodash
   */
  get _ () {
    return require('lodash')
  }

  /**
   * dayjs
   */
  get dayjs () {
    const dayjs = require('dayjs')
    const customParseFormat = require('dayjs/plugin/customParseFormat')
    dayjs.extend(customParseFormat)
    return dayjs
  }

  /**
   * elastic search
   */
  get es () {
    return singleton.es
  }

  stopES () {
    if (singleton.es) {
      singleton.es.close()
    }
  }

  /**
   * db mongoose
   * @returns {object} {namedb}
   */
  get mongodb () {
    if (this.config.mongodb && this.config.mongodb.active && this.config.mongodb.databases.length) {
      return mongDBInstance(this.config)
    } else {
      this.log.alert('Mongodb is not active')
      return undefined
    }
  }

  /**
   * Alias of mongodb
   */
  get db () {
    return this.mongodb
  }

  get auth () {
    return authInstance(this.config)
  }

  stopMongodb () {
    if (singleton.mongodb && singleton.mongodb.forEach) {
      const prom = []
      singleton.mongodb.forEach(db => {
        prom.push(db.close())
      })
      singleton.mongodb = null
      return Promise.all(prom)
    }
  }

  /**
   * ctr - object of all controllers
   * @returns {objects} ctr[name of controllers]
   */
  get ctr () {
    return controllerInstance(this.config)
  }

  /**
   * act - object of all actions
   * @returns {objects} act[module][action](data)
   */
  get act () {
    return singleton.act
  }

  /**
   * schema - object of all schemas
   * @returns {objects} schema[module][action]
   */
  get schema () {
    return singleton.schema
  }

  /**
   * @returns {object} Rabbitmq class
   */
  get rabbitmq () {
    if (this.config.rabbitmq && this.config.rabbitmq.active) {
      return rabbitMQInstance(this.config)
    }
  }

  /**
   * @returns {object} config class
   */
  get factoryConfig () {
    return this.config
  }

  stopRabbitmq () {
    if (singleton.rabbitmq) {
      const ret = singleton.rabbitmq.close()
      singleton.rabbitmq = null
      return ret
    }
  }

  /**
   * @returns {object} Ioredis class
   */
  get redis () {
    if (this.config.redis && this.config.redis.active) {
      return redisInstance(this.config)
    }
  }

  /**
   * @returns {object} pino log
   */
  get log () {
    if (singleton.logger) {
      return singleton.logger
    }
    singleton.logger = require('./app/logger')(this.config)
    return singleton.logger
  }

  stopRedis () {
    if (singleton.redis) {
      const ret = singleton.redis.disconnect()
      singleton.redis = null
      return ret
    }
  }

  /**
   * @returns {object} redis-json class
   */
  get redisJson () {
    if (this.config.redis && this.config.redis.active) {
      return redisJSONInstance(this.redis, this.config)
    }
  }

  /**
   * @returns {object} redis-scan class
   */
  get redisScan () {
    if (this.config.redis && this.config.redis.active) {
      return redisScanInstance(this.redis, this.config)
    }
  }

  /**
   * @returns {object} email service class
   */
  get email () {
    if (!singleton.email) {
      singleton.email = require('./app/helper/email')(this.config)
    }
    return singleton.email
  }

  /**
   * @returns {object} util helpers
   */
  get util () {
    if (!singleton.util) {
      singleton.util = require('./app/helper/util')(this.config)
    }
    return singleton.util
  }

  /**
   * @returns {object} token service class
   */
  get token () {
    if (!singleton.token) {
      singleton.token = require('./app/helper/token')(this.config)
    }
    return singleton.token
  }

  /**
   * @returns {object} sms service class
   */
  get sms () {
    if (!singleton.sms) {
      singleton.sms = require('./app/helper/sms')(this.config)
    }
    return singleton.sms
  }

  /**
   * @returns {object} shortlink service class
   */
  get shortlink () {
    if (!singleton.shortlink) {
      singleton.shortlink = require('./app/helper/shortlink')(this.config)
    }
    return singleton.shortlink
  }

  get envPrefix () {
    return (process.env.APP_ENV || 'dev') + '_'
  }

  get domain () {
    let prefix = 'dev' // Default
    if (process.env.APP_ENV === 'staging') {
      prefix = 'staging'
    }
    if (process.env.APP_ENV === 'production') {
      prefix = 'www'
    }
    return prefix + '.' + CW_DOMAIN
  }

  stopAll () {
    return Promise.all([this.stopFastify, this.stopMongodb, this.stopRabbitmq, this.stopRedis])
  }

  /**
   * Load all files after services start
   */
  autoloadFiles () {
    if (this.config.mongodb && this.config.mongodb.active && this.config.mongodb.databases.length) {
      require('./app/autoload/autoloadModels')(this.config)
    }
    if (this.config.rabbitmq && this.config.rabbitmq.active) {
      require('./app/autoload/autoloadServices.js')(this.config)
    }
  }
}

module.exports = Factory
