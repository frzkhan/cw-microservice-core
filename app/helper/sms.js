module.exports = function (config) {
  const { rabbitmq } = require('../../index')(config)
  const sms = {
    async sendWithTemplate (key, lang, phoneNumbers, data) {
      const template = await rabbitmq.sendAndRead('/settings/messages/get', { key: key, language: lang, type: 'sms', data: data })
      if (template && template.data) {
        const resp = await this.sendToMany(template.data, phoneNumbers)
        return resp
      } else {
        throw new Error('No template available for key : ' + key + ', language : ' + lang)
      }
    },
    async send (message, phoneNumber) {
      const response = await rabbitmq.sendAndRead('/sms/post', { message_type: 'LL', message: message, recipient: [phoneNumber] })
      return response.data
    },
    async sendToMany (message, phoneNumbers) {
      const report = []
      if (phoneNumbers) {
        if (Array.isArray(phoneNumbers) && phoneNumbers.length) {
          for (let i = 0; i < phoneNumbers.length; i++) {
            const resp = await this.send(message, phoneNumbers[i])
            report.push({ phoneNumber: phoneNumbers[i], status: resp })
          }
        } else {
          const resp = await this.send(message, phoneNumbers)
          report.push({ phoneNumber: phoneNumbers, status: resp })
        }
      }
      return report
    }
  }
  return sms
}
