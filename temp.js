const { Promise } = require('mongoose')
const config = require('config')

const { rabbitmq, log } = require('./index')(config)

function deleteAllQueue () {
  return Promise.all([
    rabbitmq.deleteQueue('/test/oneMsg'),
    rabbitmq.deleteQueue('/test/singleMsg'),
    rabbitmq.deleteQueue('/test/queue'),
    rabbitmq.deleteQueue('/test/sendAndRead')

  ])
}

async function test () {
  await deleteAllQueue()

  const tot = 100

  for (let i = 1; i <= tot; i++) {
    rabbitmq.sendAndRead('/test/sendAndRead', 'sendAndRead-' + i + '|' + 'x'.repeat(100)).then(msg => {
      log.info(msg.data.split('|')[0] + ' === ' + 'sendAndRead-' + i)
    })
  }

  let nMsg = 0
  let nReplied = 0
  const consumerTag = 'myConsumerTest'

  rabbitmq.consume('/test/sendAndRead', msg => {
    nMsg++
    log.info('Msg consumed: ' + nMsg)

    return new Promise(function (resolve, reject) {
      const nLocal = nMsg
      setTimeout(() => {
        nReplied++
        log.info('msg replied: ' + nLocal + ' ' + nReplied + ' ' + msg.data)
        return resolve(msg.data)
      },
      Math.random() * 10)
    })
  }, { consumerTag })

//   return new Promise(function (resolve, reject) {
//     log.info('cons: ' + consumerTag)
//     setTimeout(() => {
//       log.info('close consumer')
//       return resolve(rabbitmq.cancel(consumerTag))
//     }, 4000)
//   })
}

test()
