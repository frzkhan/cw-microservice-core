module.exports = function (config) {
  const { rabbitmq, act, schema, _ } = require('../index')(config)
  const pIsPromise = require('p-is-promise')
  const hasActions = Object.keys(act).length
  const hasSchema = Object.keys(schema).length

  if (!hasActions) {
    return null
  }

  rabbitmq.consume(`/${config.service}/ws`, async msg => {
    const { module, action, payload } = msg.data
    let authRule = []
    const validationSchema = _.get(schema, `${module}.${action}.schema.body`)
    const security = _.get(schema, `${module}.${action}.schema.security`)

    if (security && security.length && security[0].authorization && security[0].authorization.length) {
      authRule = security[0].authorization
    }

    const defaultResponse = {
      data: null,
      message: null
    }

    let _failReply, _successReply

    const reply = {
      cwSendFail: payload => {
        if (payload.data instanceof Error) {
          const { message, stack } = payload.data
          payload.data = { message, stack }
        }
        if (payload.error && payload.error instanceof Error) {
          const { message, stack } = payload.error
          payload.data = { message, stack }
        }
        _failReply = Object.assign({ success: false }, defaultResponse, payload)
        return _failReply
      },
      cwSendSuccess: payload => {
        _successReply = Object.assign({ success: true }, defaultResponse, payload)
        return _successReply
      }
    }

    if (hasSchema && validationSchema) {
      let errors = rabbitmq.validate(validationSchema, payload)
      if (errors) {
        if (errors instanceof Error) {
          const { message, stack } = errors
          errors = { message, stack, payload }
        }
        return reply.cwSendFail({
          service: config.service,
          module,
          action,
          message: 'reply.schema.validation.error',
          errors
        })
      }
    }
    const exec = _.get(act, `${module}.${action}`)

    if (typeof exec === 'function') {
      if (authRule.length && payload._user.permission) {
        let isAllowed = true
        for (const rule of authRule) {
          const permis = _.get(payload._user.permission, rule, false)
          if (!permis) {
            isAllowed = false
            break
          }
        }
        if (!isAllowed) {
          return reply.cwSendFail({
            service: config.service,
            module,
            action,
            message: 'reply.auth.permission.denied'
          })
        }
      }
      let auth = require('./helper/auth')(config)
      auth.setSession(payload._user.profileId, payload._user.managerId, true)
      try {
        let resp = exec(payload, reply, auth)
        if (pIsPromise(resp)) resp = await resp
        return _successReply || _failReply
      } catch (e) {
        return reply.cwSendFail({
          message: 'reply.execution.error',
          error: _failReply || e,
          action,
          module,
          payload
        })
      } finally {
        auth.clearSession()
        auth = undefined
      }
    }
    return reply.cwSendFail({
      message: 'reply.action.noFound',
      error: undefined
    })
  })
}
