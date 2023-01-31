
module.exports = function (config) {
  if (!config.swagger.active) return undefined
  const options = {
    routePrefix: '/doc',
    exposeRoute: config.swagger.exposeRoute,
    swagger: {
      info: {
        title: 'Cowellness Swagger tutorial',
        description: 'Cowellness Swagger tutorial APIS',
        version: '1.0.0'
      },
      externalDocs: {
        url: 'https://gitlab.com/cowellness/iseo/documentation/-/wikis/home',
        description: 'Find application related documentation here'
      },
      consumes: ['application/json'],
      securityDefinitions: {
        authorization: {
          type: 'apiKey',
          name: 'authorization',
          in: 'header'
        }
      },
      produces: ['application/json']
    }
  }
  if (config.fastify.prefix) {
    options.routePrefix = config.fastify.prefix + options.routePrefix
  }
  return { instance: require('fastify-swagger'), option: options }
}
