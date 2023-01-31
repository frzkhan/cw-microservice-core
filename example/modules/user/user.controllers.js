
const { mongodb } = require('../../../index.js')()

/**
 * @class UserController
 * @classdesc Controller User
 */
class UserController {
  constructor () {
    this.user = mongodb.user.model('user')
  }

  find (filter) {
    return this.user.find(filter)
  }

  create (data) {
    return this.user.create(data)
  }
}

module.exports = UserController
