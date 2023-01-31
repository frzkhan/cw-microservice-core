const fp = require('fastify-plugin')

module.exports = function (config) {
  if (!config.fastify || !config.fastify.active || !config.fastify.auth) {
    return undefined
  }
  const tokenMessage = {
    badRequestErrorMessage: 'Format is Authorization: Bearer [cwtoken]',
    noAuthorizationInHeaderMessage: 'Autorization header is missing!',
    authorizationTokenExpiredMessage: 'Authorization token expired',
    authorizationTokenInvalid: (err) => {
      return `Authorization token is invalid: ${err.message}`
    }
  }

  return fp(async function (fastify, opts) {
    // sign: { algorithm: 'ES256' },
    const { rabbitmq } = require('../../index')(config)

    fastify.register(require('fastify-jwt'), {
      secret: config.fastify.secret,
      messages: tokenMessage,
      cookie: {
        cookieName: 'cwtoken'
      }
    })

    fastify.decorate('cwauth', async function (request, reply) {
      try {
        await request.jwtVerify()
        const tokenName = request.cookies.cwtoken || request.headers.authorization.split(' ')[1]
        var m = await rabbitmq.sendAndRead('/auth/verify/token', { token: tokenName })
        if (!m.data) {
          reply.cwsendFail({ data: 'Invalid token' })
        } else {
          request.cwauth = m.data
          request.tokenKey = tokenName
        }
      } catch (err) {
        reply.cwsendFail({ data: err })
      }
    })
  })
}
