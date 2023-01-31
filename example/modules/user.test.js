const cw = require('../testIndex')

beforeAll(async () => {
  await cw.autoStart()
})

afterAll(async () => {
  await cw.autoStop()
})

describe('Test User', () => {
  it('Should validated controller for user', (done) => {
    expect(cw.ctr.user).toBeDefined()
    done()
  })
  it('Should check if http server is runing', async () => {
    const data = await cw.fastify.inject({ method: 'GET', url: '/api/example/user/testLog' })
    expect(data).toBeDefined()
    expect(data.json().data).toBe('Information is logged')
  })
  it('Should validate database call', async () => {
    const data = await cw.fastify.inject({ method: 'GET', url: '/api/example/user/' })
    expect(data.json().data.length).toBe(0)
  })
  it('Should return cookie on login', async () => {
    const data = await cw.fastify.inject({ method: 'GET', url: '/api/example/user/test/login' })
    expect(data.statusCode).toEqual(200)
    expect(data.headers['set-cookie'].length).toBeGreaterThan(0)
  })
  // need to mock rabbit mq call to auth service
  // it('Should resolve user based on token', async () => {
  //   const data = await cw.fastify.inject({ method: 'GET', url: '/api/example/user/test/login' })
  //   expect(data.headers['set-cookie']).toContain('cwtoken')
  //   const data1 = await cw.fastify.inject({ method: 'GET', url: '/api/example/user/test/user', headers: { cookie: data.headers['set-cookie'] } })
  //   expect(data1.statusCode).toEqual(200)
  //   const responseData = data1.json()
  //   expect(responseData.data.name).toBe('Ashwin  Shetty')
  // })
})
