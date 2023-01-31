const { Promise } = require('mongoose')
const config = require('config')

const { rabbitmq, log } = require('../index')(config)

const testMsg = 'test-message-' + Date.now()

function deleteAllQueue () {
  return Promise.all([
    rabbitmq.deleteQueue('/test/oneMsg'),
    rabbitmq.deleteQueue('/test/singleMsg'),
    rabbitmq.deleteQueue('/test/queue'),
    rabbitmq.deleteQueue('/test/sendAndRead')
  ])
}

beforeAll(() => {
  return deleteAllQueue()
})

afterAll(async () => {
  console.log('after all - chiudo')
  await deleteAllQueue()
  return rabbitmq.close()
})

describe('Test RabbitMQ', () => {
  it('should test send and get one', async () => {
    rabbitmq.send('/test/oneMsg', testMsg)
    return rabbitmq.get('/test/oneMsg').then(msg => {
      expect(msg.data).toBe(testMsg)
    })
  })

  it('should test sendAndRead', async () => {
    return Promise.all([
      rabbitmq.consume('/test/singleMsg', (msg) => {
        expect(msg.data).toBe(testMsg)
        return new Promise(function (resolve, reject) {
          setTimeout(() => {
            resolve('Thanks')
          }, 500)
        })
      }, { prefetch: 1 }),

      rabbitmq.sendAndRead('/test/singleMsg', testMsg).then(msg => {
        expect(msg.data).toBe('Thanks')
      })
    ])
  })

  it('should validate incoming message (invalid data)', async () => {
    return Promise.all([
      rabbitmq.consume('/test/validateMsg', (msg) => {
        // expect(msg.data).toBe(testMsg)
        return new Promise(function (resolve, reject) {
          setTimeout(() => {
            resolve('Thanks')
          }, 500)
        })
      }, { prefetch: 1, schema: { type: 'object', required: ['username'] } }),

      rabbitmq.sendAndRead('/test/validateMsg', testMsg).then(msg => {
        expect(msg.data).not.toBe('Thanks')
      })
    ])
  })

  it('should validate incoming message (valid data)', async () => {
    const data = { username: 'ashwin' }
    return Promise.all([
      rabbitmq.consume('/test/validateMsg', (msg) => {
        expect(msg.data).toStrictEqual(data)
        return new Promise(function (resolve, reject) {
          setTimeout(() => {
            resolve('Thanks')
          }, 500)
        })
      }, { prefetch: 1, schema: { type: 'object', required: ['username'] } }),

      rabbitmq.sendAndRead('/test/validateMsg', data).then(msg => {
        expect(msg.data).toBe('Thanks')
      })
    ])
  })

  it('should test publish', async () => {
    const sendMsg = 'testMsg'
    return Promise.all([
      rabbitmq.subscribe(config.service, (msg) => {
        expect(msg.data).toBe(sendMsg)
        return new Promise(function (resolve, reject) {
          setTimeout(() => {
            resolve('Thanks')
          }, 500)
        })
      }, { prefetch: 1 }),

      rabbitmq.publish(sendMsg)
    ])
  })

  it('should test sendAndRead', async () => {
    const tot = 5

    for (let i = 1; i <= tot; i++) {
      rabbitmq.sendAndRead('/test/sendAndRead', 'sendAndRead-' + i).then(msg => {
        expect(msg.data).toBe('sendAndRead-' + i)
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

    return new Promise(function (resolve, reject) {
      log.info('cons: ' + consumerTag)
      setTimeout(() => {
        log.info('close consumer')
        return resolve(rabbitmq.cancel(consumerTag))
      }, 4000)
    })
  })
})
