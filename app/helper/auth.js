module.exports = function (config) {
  const { es, envPrefix } = require('../../index')(config)

  //   const roles = ['TT', 'RE', 'DI', 'OP', 'TR', 'SA']
  //   const nonBusiness = ['IN', 'TU', 'CO']
  //   const GYM = ['CH', 'CW', 'CU', 'GH', 'GY', 'GU', 'SI']
  //   const superUser = ['CH', 'CW', 'CU']

  let profId
  let managId
  let preLoaded = false
  let silent = false
  // Adding this to only work for short span like action calling
  let cachedRole = []

  function verifyIds (profileId, managerId) {
    if (!profileId && !profId && !silent) throw new Error('profileId not available')
    if (!managerId && !managId && !silent) throw new Error('managerId not available')
    return {
      profileId: profileId || profId,
      managerId: managerId || managId
    }
  }

  function verifyRole (roles, rolesToVerify) {
    if (!roles || !roles.length) return false
    if (!rolesToVerify || !rolesToVerify.length) return false
    let isAvailable = false

    rolesToVerify.forEach((toVerify) => {
      if (roles.includes(toVerify)) {
        isAvailable = true
      }
    })

    return isAvailable
  }

  async function queryEs (obj) {
    if (!obj.profileId || !obj.managerId) return []

    if (preLoaded && obj.profileId === profId && obj.managerId === managId) {
      return cachedRole
    }
    let roles = []
    const query = { bool: { must: [], must_not: [], should: [{ bool: { must: [{ match: { leftProfileId: obj.profileId } }, { match: { rightProfileId: obj.managerId } }] } }, { bool: { must: [{ match: { leftProfileId: obj.managerId } }, { match: { rightProfileId: obj.profileId } }] } }] } }
    const resp = await es.search({ index: envPrefix + 'relations', type: '_doc', body: { query: query } })
    if (resp && resp.hits && resp.hits.hits && resp.hits.hits.length && resp.hits.hits[0]._source.roles && resp.hits.hits[0]._source.roles.length) {
      roles = resp.hits.hits[0]._source.roles.map((r) => {
        return r.role
      })
    } else {
      roles = []
    }
    if (obj.profileId === profId && obj.managerId === managId) {
      preLoaded = true
      cachedRole = roles
    }
    return roles
  }

  return {
    clearSession () {
      profId = undefined
      managId = undefined
      cachedRole = []
      preLoaded = false
    },
    getSession () {
      return { profileId: profId, managId: managId }
    },
    setSession (profileId, managerId, isSilent = false) {
      profId = profileId
      managId = managerId
      silent = isSilent
    },
    async isDirector (profileId = undefined, managerId = undefined) {
      const param = verifyIds(profileId, managerId)
      const roles = await queryEs(param)
      return verifyRole(roles, ['DI'])
    },
    async isOperator (profileId = undefined, managerId = undefined) {
      const param = verifyIds(profileId, managerId)
      const roles = await queryEs(param)
      return verifyRole(roles, ['OP'])
    },
    async isDirectorOrOperator (profileId = undefined, managerId = undefined) {
      const param = verifyIds(profileId, managerId)
      const roles = await queryEs(param)
      return verifyRole(roles, ['DI', 'OP'])
    },
    async isTrainer (profileId = undefined, managerId = undefined) {
      const param = verifyIds(profileId, managerId)
      const roles = await queryEs(param)
      return verifyRole(roles, ['PT', 'CT'])
    },
    async isPersonalTrainer (profileId = undefined, managerId = undefined) {
      const param = verifyIds(profileId, managerId)
      const roles = await queryEs(param)
      return verifyRole(roles, ['PT'])
    },
    async isCourseTrainer (profileId = undefined, managerId = undefined) {
      const param = verifyIds(profileId, managerId)
      const roles = await queryEs(param)
      return verifyRole(roles, ['CT'])
    },
    async isSalesman (profileId = undefined, managerId = undefined) {
      const param = verifyIds(profileId, managerId)
      const roles = await queryEs(param)
      return verifyRole(roles, ['SP'])
    },
    async isTutor (profileId = undefined, managerId = undefined) {
      const param = verifyIds(profileId, managerId)
      const roles = await queryEs(param)
      return verifyRole(roles, ['TU'])
    },
    async isCleaner (profileId = undefined, managerId = undefined) {
      const param = verifyIds(profileId, managerId)
      const roles = await queryEs(param)
      return verifyRole(roles, ['CL'])
    },
    async getRoles (profileId = undefined, managerId = undefined) {
      const param = verifyIds(profileId, managerId)
      const roles = await queryEs(param)
      return roles
    }

  }
}
