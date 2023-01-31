
const { mongodb } = require('../../index.js')

const Schema = mongodb.user.Schema

const user = new Schema(
  {
    active: {
      type: Boolean,
      required: true,
      default: false,
      index: true
    },
    name: {
      type: String,
      required: true,
      index: true
    }
  },
  { timestamps: true }
)

module.exports = mongodb.user.model('user', user)
