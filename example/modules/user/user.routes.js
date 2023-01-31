
const { ctr, redis, redisJson, rabbitmq, log } = require('../../index.js')

module.exports = async function (fastify, opts, done) {
  fastify.get('/', async function (request, reply) {
    const data = await ctr.user.find({})
    reply.cwsendSuccess({ data: data })
  })

  fastify.get('/autocreate', async function (request, reply) {
    const data = await ctr.user.create({ active: true, name: 'test_' + Date.now() })
    reply.cwsendSuccess({ data: data })
  })

  fastify.get('/testredis', async function (request, reply) {
    await redis.set('test_redis', 'simple test redis')
    await redisJson.set('test_redis_json', { test_redis_json: 'value of test redis json' })
    const testRedis = await redis.get('test_redis')
    const testRedisJson = await redisJson.get('test_redis_json')
    reply.cwsendSuccess({ testRedis, testRedisJson })
  })

  fastify.get('/testrabbit', async function (request, reply) {
    await rabbitmq.send('coda01', 'ciao, messaggio in coda inviato')
    const msg = await rabbitmq.get('coda01')
    msg.decoded = msg.content.toString()
    reply.cwsendSuccess({ data: 'Risulato coda01: ' + JSON.stringify(msg) })
  })

  fastify.get('/testLog', async function (request, reply) {
    const m = 'Information is logged'
    log.info(m)
    reply.cwsendSuccess({ data: m })
  })

  fastify.get('/testFastifyCommonSend', async function (request, reply) {
    reply.cwsendSuccess({ name: 'fastify common send' })
  })

  fastify.get('/test/login', async function (request, reply) {
    const cwToken = await reply.jwtSign({
      name: 'Ashwin  Shetty',
      role: ['admin', 'spy']
    })
    reply
      .setCookie('cwtoken', cwToken, {
        domain: '*',
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: true
      })
      .code(200)
      .cwsendSuccess({ data: { name: 'Ashwin Shetty' } })
  })

  fastify.get('/test/user', { preValidation: [fastify.cwauth] }, async function (request, reply) {
    reply.cwsendSuccess({ data: request.user })
  })

  done()
}
