const fp = require('fastify-plugin')

module.exports = fp(function (fastify, options, next) {
  const defaultResponse = {
    message: null,
    _message: null,
    data: {}
  }

  function success (payload) {
    const response = Object.assign({ success: true }, defaultResponse, payload)

    this.send(response)
  }

  function fail (payload) {
    const response = Object.assign({ success: false }, defaultResponse, payload)

    this.send(response)
  }

  fastify.decorateReply('cwsendSuccess', success)
  fastify.decorateReply('cwsendFail', fail)

  next()
})
