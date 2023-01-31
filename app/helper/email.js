module.exports = function (config) {
  const { rabbitmq } = require('../../index')(config)
  return {
    /**
   * Send emails via email service
   * @param {string} to array of string email id
   * @param {string} cc array of string email id
   * @param {string} name the template
   * @param {string} lang code
   * @param {Object} params array which will be processed at the time of mail processing
   * @returns email service response
   */
    async sendEmail (to, cc, name, lang, data) {
      const req = {
        sender: {
          to: to,
          cc: cc || []
        },
        name: name,
        lang: lang,
        data: data
      }
      return await rabbitmq.sendAndRead('/mail/send', req)
    }
  }
}
