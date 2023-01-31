module.exports = function (config) {
  const connectRedis = require('connect-redis')
  const redisClient = require('./redis')(config)
  const fastifySession = require('fastify-session')
  const routes = require('./autoload/autoloadRoutes.js')(config)
  const customlog = require('./logger')(config).child({ name: 'fastify' })
  const fSender = require('./plugin/fastifyCommonSend')
  const ajv = require('./plugin/fastifyAjv')
  const fs = require('fs')
  const path = require('path')
  const ajvErrorNormalise = require('./plugin/ajvErrorNormalise')
  const swagger = require('./swagger')(config)

  const RedisStore = connectRedis(fastifySession)
  const port = config.fastify.port
  const corsAllowed = config.fastify.allowCORs || false

  const app = require('fastify')({
    bodyLimit: config.fastify.size || 1048576,
    logger: customlog,
    ajv
  })

  const auth = require('./plugin/fastifyAuth')(config)
  if (auth) {
    auth(app)
  }

  if (swagger) {
    app.register(swagger.instance, swagger.option)
  }
  if (fs.existsSync(path.join(config.basepath, '..', 'public'))) {
    app.register(require('fastify-static'), {
      root: path.join(config.basepath, '..', 'public'),
      prefix: config.fastify.prefix + '/public/'
    })
  }
  app.register(fSender)
  app.register(require('fastify-cookie'))
  app.register(fastifySession, {
    secret: config.fastify.sessionSecret,
    cookie: {
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: corsAllowed ? 'None' : false
    },
    store: new RedisStore({ client: redisClient })
  })
  app.register(routes)

  // added response header;
  app.addHook('onRequest', function (request, reply, next) {
    reply.header('x-powered-by', 'co-welness.com')
    reply.header('api-version', config.version)
    reply.header('server-time', Date.now())
    if (corsAllowed) {
      reply.header('Access-Control-Allow-Credentials', true)
      reply.header('Access-Control-Allow-Origin', request.hostname)
      reply.header('Access-Control-Allow-Headers', 'X-PINGOTHER, Content-Type')
    }
    next()
  })

  // To handle request without any route
  app.setNotFoundHandler(function (request, reply) {
    reply.code(404).send({ type: 'error', message: 'Route not found.' })
  })

  app.setErrorHandler(function (error, request, reply) {
    if (error.validation) {
      const validationResponse = ajvErrorNormalise(error.validation)

      return reply.cwsendFail({
        message: 'Data validation failed',
        errors: validationResponse
      })
    }
    reply.log.error(error)
    return reply.code(500).cwsendFail({
      message: error.message || 'Error',
      errors: error
    })
  })
  // Default route for testing
  app.get('/', async function (request, reply) {
    reply.send('ok')
  })

  return new Promise((resolve) => {
    app.listen(port, '0.0.0.0', (err) => {
      if (err) {
        app.log.alert('Application crashed')
        app.log.error(err)
        setTimeout(() => {
          process.exit(1)
        }, 1000)
      } else {
        if (swagger) app.swagger()
      }
      resolve(app)
    })
  })
}
