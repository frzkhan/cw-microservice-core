const mongoose = require('mongoose')

function customAjvType (ajv) {
  ajv.addKeyword('typeof', {
    compile: function (schema) {
      return function (data) {
        if (schema === 'ObjectId') {
          return mongoose.Types.ObjectId.isValid(data)
        } else
        if (schema === 'Base64') {
          const re = new RegExp('^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{4})$')

          return re.test(data)
        }
      }
    }
  })
}

module.exports = customAjvType
