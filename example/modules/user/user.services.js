const { ctr, rabbitmq } = require('../../../index.js')()

rabbitmq.consume('/settings/user/getAllUser', (msg) => {
  const filter = msg.data
  return ctr.user.find(filter)
})
