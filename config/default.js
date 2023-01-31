const path = require('path')
const basepath = path.join(__dirname)

const fs = require('fs')
const pack = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), { encoding: 'utf-8' }))
const version = pack.version || '0.0.0'

module.exports = {
  service: 'cw-micro-service',
  fastify: {
    active: true,
    port: 3010,
    prefix: '/api/example',
    size: 1048576,
    auth: true,
    secret: 'cw-micro-service',
    sessionSecret: 'cw-micro-service-fastify-session-secret',
    allowCORs: true
  },
  rabbitmq: { active: true, server: 'localhost:15672', user: 'dev', password: 'dev123' },
  redis: { active: true, server: 'localhost', port: '16379' },
  swagger: { active: true, exposeRoute: true },
  elasticSearch: { active: true, server: 'localhost:9200', timeout: 0, version: '7.6' },
  logger: {
    level: 'info',
    destination: {
      minLength: 4096, // Buffer before writing
      sync: false // Asynchronous logging
    }
  },
  basepath,
  version,
  mongodb: {
    active: true,
    server: 'localhost',
    port: '',
    user: '',
    password: '',
    debug: false,
    databases: [
      {
        name: 'user',
        db: 'user',
        options: { auto_reconnect: true }
      }
    ]
  }
}
