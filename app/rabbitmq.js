module.exports = function (config) {
  // const amqplib = require('amqplib')
  const amqp = require('amqp-connection-manager')
  const pIsPromise = require('p-is-promise')
  const { isBuffer } = require('lodash')
  const Ajv = require('ajv')
  const ajvConfig = require('./plugin/fastifyAjv')
  const ajvErrorNormalise = require('./plugin/ajvErrorNormalise')
  const { server, user, password } = config.rabbitmq
  const log = require('./logger')(config).child({ name: 'rabbitMQ' })
  const _connection = amqp.connect(['amqp://' + user + ':' + password + '@' + server])
  let errorFlag = false
  const GlobalExpiration = 30 * 1000

  _connection.on('connect', function () {
    log.info('Connected to MQ')
    errorFlag = false
  })
  _connection.on('disconnect', function (err) {
    if (!errorFlag) {
      log.alert('Disconnected from MQ : ' + err.err.message)
      errorFlag = true
    }
  })

  const service = {
    /**
   * Close connection
   */
    async close () {
      if (_connection) await _connection.close()
    },

    /**
     * Get Channel Wrapper
     */

    getChannelWrapper () {
      return _connection.createChannel({ json: false })
    },

    /**
     * Get amqplib connection - used for special function that not work in connection manager (ex. delete Queue)
     */
    async getAmqpLibConnection () {
      if (_connection._connectPromise) {
        await _connection._connectPromise
      }
      return _connection._currentConnection
    },

    /**
     * Generate a random correlation Id for reply
     */
    generateCorrelationId () {
      return Date.now() + '-' + (Math.floor(Math.random() * 1000))
    },

    /**
     * Static name of queue for reply
     */
    getRandomReplyQueue () {
      return 'RPC:' + config.service + '-' + this.generateCorrelationId()
    },

    /**
     * Static name of exchange for publish broadcast message
     */
    getExchange () {
      return 'exchange:' + config.service
    },

    /**
     * Create a default exchange of the service
     */
    async createDefaultExchange () {
      return this.createExchange(service.getExchange())
    },

    /**
     * Create a exchange
     */
    async createExchange (exchange) {
      const cw = service.getChannelWrapper()
      return cw.addSetup(function (ch) {
        return ch.assertExchange(exchange, 'fanout')
      })
    },

    /**
     * Ack a message
     *
     * @param {Object} msg
     */
    async ack (msg) {
      if (msg) {
        const cw = service.getChannelWrapper()
        return cw.ack(msg)
      }
    },

    /**
     * Send message to queue
     *
     * @param {String} queue name of the queue
     * @param {Any} msg message to send
     * @param {Object} [options] Options for sendToQueue
     *
     * @return {Promise} return of sendToQueue
     */
    async send (queue, msg, options = {}) {
      log.info(`SEND message to ${queue} options ` + JSON.stringify(options))
      log.debug(msg)
      msg = service.encode(msg)
      const cw = service.getChannelWrapper()
      cw.addSetup((ch) => {
        return options.noAssertQueue ? '' : ch.assertQueue(queue)
      })
      return cw.sendToQueue(queue, msg, options).then(() => {
        cw.close()
      })
    },

    /**
     *
     * @param {String} msg
     * @param {String} exchange if null use default exchange of service
     */
    async publish (msg, exchange) {
      exchange = exchange || service.getExchange()
      log.info(`PUBLISH message to ${exchange} `)
      log.debug(msg)
      msg = service.encode(msg)
      const cw = this.getChannelWrapper()
      return new Promise(function (resolve, reject) {
        cw.addSetup(function (ch) {
          return Promise.all([
            resolve(ch.publish(exchange, '', msg))
          ]).finally(() => {
            cw.close()
          })
        })
      })
    },

    /**
     * Subribe to a cw.service
     *
     * @param {String} cwService  (ex. service-settings)
     */
    async subscribe (cwService, cb, options) {
      log.info(`SUBSCRIBE from service ${cwService} `)
      options.exchange = 'exchange:' + cwService
      options.durable = false
      options.exclusive = true
      options.autoDelete = true
      options.noAck = true
      return service.consume('', cb, options)
    },

    /**
     * Get ONE message from a queue
     *
     * @param {String} queue
     */
    async get (queue) {
      const options = { prefetch: 1 }
      return new Promise(function (resolve, reject) {
        service.consume(queue, function (msg) {
          return resolve(msg)
        }, options)
      })
    },

    /**
     * Enable consume of queue and possible reply, manage also prefetch and bind to exchange
     *
     * @param {String} queue name of the queue
     * @param {Function} cb(msg) call function for each message. Must return true or promise true for ack msg, if reply is enabled, accept msg to send
     * @param {Object} [options] use prefetch to limit consume, add exchange to connect to exchange {prefetch:1}  {exchange:'xxx'}
     *
     * @returns {Promise} return Object {consumerTag: {String}}
     */
    async consume (queue, cb, options = { }) {
      log.info(`enable consume from  ${queue}`)
      options.expiration = options.expiration || GlobalExpiration
      const noAck = options.noAck === true
      const cw = service.getChannelWrapper()
      await cw.addSetup(function (ch) {
        return Promise.all([
          ch.assertQueue(queue, options),
          (async function () {
            if (options.prefetch) {
              log.info('prefetch to ' + options.prefetch)
              await ch.prefetch(options.prefetch)
            }
          })(), (async function () {
            if (options.exchange) {
              log.info(`bind queue ${queue} to exchange ${options.exchange}`)
              await ch.bindQueue(queue, options.exchange, '')
            }
          })(),
          ch.consume(queue, async msg => {
            log.info(`receive from ${queue}`)
            const msgDecoded = service.decode(msg)
            log.debug(msgDecoded)
            let reply
            let validationErrors = false

            if (options.schema) {
              validationErrors = service.validate(options.schema, msgDecoded.data)
            }

            if (validationErrors) {
              reply = { errors: validationErrors, result: 'validation failed' }
            } else {
              try {
                reply = cb(msgDecoded)
                if (pIsPromise(reply)) {
                  reply = await reply
                }
              } catch (error) {
                const { message, stack } = error
                reply = { errors: { message, stack }, result: 'callback failed' }
              }
            }

            if (!noAck) {
              log.info(`RabbitMQ: ack msg in ${queue}`)
              await ch.ack(msg)
            }
            if (options.prefetch) {
              cw.close()
            }
            const replyTo = msg.properties.replyTo

            if (replyTo) {
              log.info(`send reply ${replyTo}`)
              log.debug(reply)
              return service.send(msg.properties.replyTo, reply, { expiration: options.expiration, noAssertQueue: true })
            }
          }, options)
        ])
      })
    },

    /**
     * Send a message to queue and whait reply
     *
     * @param {String} queue name of the queue
     * @param {Any} msg message to send
     * @param {object} options  expiration of message and consume, default 10 second
     *
     * @returns {Promise} msg from reply
     */
    async sendAndRead (queue, msg, options = {}) {
      const cw = service.getChannelWrapper()
      const replyTo = service.getRandomReplyQueue()
      const consumerTag = this.generateCorrelationId()
      const expiration = options.expiration || GlobalExpiration

      var timeoutId = ''
      log.info(`send to queue ${queue} and read reply from ${replyTo} - consumerTag: ${consumerTag}`)

      return new Promise(function (resolve, reject) {
        cw.addSetup(function (ch) {
          return Promise.all([

            // timeout for close consume
            new Promise(() => {
              timeoutId = setTimeout(() => {
                log.error(`TIMEOUT  ${replyTo}  consumerTag: ${consumerTag} `)
                ch.cancel(consumerTag).then(() => {
                  cw.close()
                  log.error('Time out for request queue : ' + queue + ', reply to : ' + replyTo + ', - consumerTag: ' + consumerTag + ', - data ' + JSON.stringify(msg))
                  return reject(new Error('timeout consume'))
                })
              }, expiration + 1000)
            }),

            // Prefetch
            ch.prefetch(1),

            // Assert queue + consume and send
            ch.assertQueue(replyTo, { durable: false, autoDelete: true, expires: expiration * 2 }).then(() => {
              return ch.consume(replyTo, async function (msg) {
                clearTimeout(timeoutId)
                cw.close()
                return resolve(service.decode(msg))
              }, {
                noAck: true,
                consumerTag
              })
            }).then(() => {
              return service.send(queue, msg, { replyTo, expiration })
            })
          ])
        })
      })
    },

    /**
     * Cancel a consume of queue
     *
     * @param {String} consumerTag
     */
    async cancel (consumerTag) {
      log.info(`disable consume  ${consumerTag}`)
      const cw = this.getChannelWrapper()
      cw.addSetup(function (ch) {
        return ch.cancel(consumerTag)
      })
    },

    /**
     * Delete a queue
     *
     * @param {String} queue
     */
    async deleteQueue (queue) {
      log.info(`delete queue: ${queue}`)
      return service.getAmqpLibConnection().then(conn => {
        return conn.createChannel()
      }).then(ch => {
        return ch.deleteQueue(queue).then(() => {
          ch.close()
        })
      })
    },

    /**
     * Purge a Queue - if queue not exist, trown error!
     * @param {String} queue
     */
    async purgeQueue (queue) {
      log.info(`purge queue: ${queue}`)
      return service.getAmqpLibConnection().then(conn => {
        return conn.createChannel()
      }).then(ch => {
        return ch.purgeQueue(queue).then(() => {
          ch.close()
        })
      })
    },

    /**
     * Encode message to send
     *
     * @param {String|Object|Array|Number|Buffer} msg msg to send
     */
    encode (msg) {
      return Buffer.from(JSON.stringify({ data: msg }))
    },

    /**
     * Decode message received
     *
     * @param {Object} msg
     */
    decode (msg) {
      if (msg && msg.content && isBuffer(msg.content)) {
        try {
          msg.data = JSON.parse(msg.content.toString()).data
          msg.content = null
        } catch (error) {
          msg.data = null
        }
      }
      return msg
    },

    /**
    * validate message received
    *
    * @param {Object} schema
    * @param {Object} json
    */
    validate (schema, json) {
      const ajv = new Ajv(ajvConfig.customOptions)

      ajv.validate(schema, json)
      if (ajv.errors) {
        return ajvErrorNormalise(ajv.errors)
      }
      return null
    }
  }

  service.createDefaultExchange()

  return service
}
