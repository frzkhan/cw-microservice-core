const cw = require('../index')(require('config'))

beforeAll(() => {
  return cw.autoStart()
})

afterAll(async () => {
  return cw.stopES()
})

describe('Test Auth', () => {
  it('pre handler for Auth should be injected', async () => {
    expect(cw.fastify.cwauth).toBeDefined()
  })
})
