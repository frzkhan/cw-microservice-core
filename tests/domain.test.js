const cw = require('../index')(require('config'))

beforeAll(() => {
//   return cw.autoStart()
})

afterAll(async () => {
//   return cw.autoStop()
})

describe('Test  domain', () => {
  it('Default domain  ', () => {
    process.env.APP_ENV = ''
    expect(cw.domain).toBe('dev.cowellness.net')
  })

  it('Dev domain  ', () => {
    process.env.APP_ENV = 'dev'
    expect(cw.domain).toBe('dev.cowellness.net')
  })

  it('Staging domain  ', () => {
    process.env.APP_ENV = 'staging'
    expect(cw.domain).toBe('staging.cowellness.net')
  })

  it('Production domain  ', () => {
    process.env.APP_ENV = 'production'
    expect(cw.domain).toBe('www.cowellness.net')
  })
})
