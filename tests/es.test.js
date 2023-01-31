const cw = require('../index')(require('config'))

beforeAll(() => {
  return cw.autoStart()
})

afterAll(async () => {
  return cw.stopES()
})

describe('Test ES', () => {
  it('ES should be defined ', async () => {
    expect(cw.es).toBeDefined()
  })
  it('ES should make DB call', async () => {
    const data = await cw.es.search({ q: 'test' })
    expect(data).toBeDefined()
  })
})
