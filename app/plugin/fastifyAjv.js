module.exports = {
  customOptions: { allErrors: true, jsonPointers: true, nullable: true },
  plugins: [
    require('ajv-errors'),
    require('./customAjvType')
  ]
}
