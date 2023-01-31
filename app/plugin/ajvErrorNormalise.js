const _ = require('lodash')

function ajvErrorNormalise (errors) {
  return errors.reduce(
    function (acc, e) {
      const missingProperty = _.get(e, 'params.missingProperty')
      const invalidType = _.get(e, 'params.type') || _.get(e, 'params.keyword') === 'typeof'
      const invalidLength = _.get(e, 'params.limit', null) !== null
      const invalidFormat = _.get(e, 'params.pattern')
      const invalidValue = _.get(e, 'params.allowedValues')
      const isSkipped = e.keyword === 'anyOf' || e.keyword === 'oneOf' || e.keyword === 'allOf'

      if (e.dataPath.length && e.dataPath[0] === '.') {
        acc[e.dataPath.slice(1)] = [e.message.toUpperCase()[0] + e.message.slice(1)]
      } else {
        let reason = null
        if (missingProperty) {
          reason = 'errors.field_required'
        } else
        if (invalidType) {
          reason = 'errors.field_invalid_type'
        } else
        if (invalidLength) {
          reason = 'errors.field_invalid_length'
        } else
        if (invalidFormat) {
          reason = 'errors.field_invalid_format'
        } else
        if (invalidValue) {
          reason = 'errors.field_invalid_value'
        } else
        if (isSkipped) {
          return acc
        }
        const key = [e.dataPath.replace(/\//, '').replace(/\//g, '.'), missingProperty].filter(k => !!k).join('.')
        acc[key] = [reason]
      }
      return acc
    },
    {}
  )
}

module.exports = ajvErrorNormalise
