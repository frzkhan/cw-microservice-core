module.exports = function (config) {
  const { rabbitmq } = require('../../index')(config)
  return {
    /**
   * Create persisted object via token service
   * @param {Object} data the data to store
   * @param {Number} expire expiry ttl
   * @returns generated token
   */
    async save (data, expire) {
      return await rabbitmq.sendAndRead('/tokens/post', {
        data: data,
        expire: expire
      })
    },

    /**
         * Fetch data from token service
         * @param {String} id token id
         * @returns data
         */
    async getById (id) {
      return await rabbitmq.sendAndRead('/tokens/get', { id: id })
    },

    /**
         * Delete a token from token service
         * @param {String} id token id
         * @returns true
         */
    async remove (id) {
      return await rabbitmq.sendAndRead('/tokens/delete', { id: id })
    }
  }
}
