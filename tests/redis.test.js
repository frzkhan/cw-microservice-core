const { redis, redisJson, redisScan } = require('../index')(require('config'))

beforeAll(() => {
  return redis.flushdb()
})

describe('Test Redis', () => {
  it('Add and fetch key value', async () => {
    await redis.set('test', 'hello')
    const data = await redis.get('test')
    expect(data).toBe('hello')
  })
  it('should clear the db', async () => {
    await redis.set('newKey', 'newValue')
    const beforeFlush = await redis.get('newKey')
    await redis.flushdb()
    const afterFlush = await redis.get('newKey')
    expect(beforeFlush).toBe('newValue')
    expect(afterFlush).toBe(null)
  })
})

describe('Test Redis Json', () => {
  it('Add and fetch json object', async () => {
    const testJson = { name: 'test', type: 'json' }
    await redisJson.set('testJson', testJson)
    const data = await redisJson.get('testJson')
    expect(data).toStrictEqual(testJson)
  })
  it('Add and fetch json key', async () => {
    const testJson = { name: 'test', type: 'json' }
    await redisJson.set('testJson', testJson)
    const data = await redisJson.get('testJson', 'name')
    expect(data.name).toBe(testJson.name)
  })
})

describe('Test Redis Scan', () => {
  it('Add and scan key', async () => {
    await redis.set('other', 'null')
    await redis.set('name1:value1', '1-1')
    await redis.set('name1:value2', '1-2')
    await redis.set('name2:value2', '2-2')

    const data = await redisScan.scan('name*')
    expect(data.length).toBe(3)
  })
})
