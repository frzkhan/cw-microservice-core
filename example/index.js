const config = {
  service: 'test',
  basepath: __dirname,
  mongodb: {
    active: true,
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
const server = require('../index.js')(config)
module.exports = server
server.autoStart()
