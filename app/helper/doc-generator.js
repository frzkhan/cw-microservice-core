const path = require('path')
const glob = require('glob')
const YAML = require('json2yaml')
const config = require('config')
const Generator = require('@asyncapi/generator')

const template = JSON.parse('{"asyncapi":"2.0.0","info":{"title":"Setting API","version":"1.0.0","description":"Setting API documentation","license":{"name":"Apache 2.0","url":"https://www.apache.org/licenses/LICENSE-2.0"}},"servers":{"production":{"url":"dev.cowellness.net/api/ws:{port}","protocol":"ws","description":"Websocket","variables":{"port":{"description":"Secure connection (TLS) is available through port 443.","default":"443","enum":["443","80"]}}}},"defaultContentType":"application/json","channels":{"/":{"description":"Will get settings values","publish":{"message":{"payload":{"type":"object","required":["service","module","action","payload"],"properties":{"service":{"type":"string","minLength":1},"module":{"type":"string","minLength":1},"action":{"type":"string","minLength":1},"payload":{"type":"object"}}}}},"subscribe":{"message":{"oneOf":[{"$ref":"#/components/messages/language"},{"$ref":"#/components/messages/languageMD5"}]}}}},"components":null}')
const dir = path.join(config.basepath, 'modules')
const files = glob.sync(path.join(dir, '/**/*.schema.js'), {})

const schemaData = { components: { messages: {} } }
const schemaPointer = []

console.log('Reading schema files from Module folder')

template.info.title = config.service + ' Api'
template.info.description = config.service + ' Api Documentation'

files.forEach((file) => {
  console.log('Loading: -->  ' + file)
  const schema = require(file)
  const moduleName = path.parse(file).name.split('.')[0]
  for (var key in schema) {
    if (schema[key] && schema[key].schema && (schema[key].schema.body || schema[key].schema.params) && schema[key].schema.security) {
      const template = schema[key].schema.body || schema[key].schema.params
      schemaData.components.messages[moduleName + '.' + key] = { summary: ' Service: ' + config.service + ', Description: ' + schema[key].schema.summary, payload: template, title: 'Module: ' + moduleName }
      schemaPointer.push({ pointer: { $ref: '#/components/messages/' + moduleName + '.' + key }, key: moduleName + '.' + key })
    }
  }
})

console.log('Read schema files from Module folder')

console.log('Sorting by name')
schemaPointer.sort((a, b) => {
  if (a.key < b.key) {
    return -1
  }
  if (a.key > b.key) {
    return 1
  }
  return 0
})
template.channels['/'].subscribe.message.oneOf = schemaPointer.map((e) => { return e.pointer })
console.log('Sorted by name')

template.components = schemaData.components
console.log('Starting doc generation process')
const htmlGenerator = new Generator('@asyncapi/html-template', path.resolve(path.join(config.basepath, '..', 'public', 'doc')))
const process = async () => { return await htmlGenerator.generateFromString(YAML.stringify(template)) }
process()
console.log('WS Doc generated from yaml at ' + Date())
