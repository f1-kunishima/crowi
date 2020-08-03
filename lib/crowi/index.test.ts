import { crowi } from 'server/test/setup'

describe('Test for Crowi application context', () => {
  // test crowi object by environment

  describe('construction', () => {
    test('initialize crowi context', () => {
      expect(crowi.version).toBe(require('../../package.json').version)
      expect(crowi.isInitialized()).toBe(true)
      expect(typeof crowi.env).toBe('object')
    })

    test('config getter, setter', () => {
      expect(crowi.getConfig()).toEqual({ crowi: {} })
      crowi.setConfig({})
      expect(crowi.getConfig()).toEqual({})
      crowi.setConfig({ test: 1 })
      expect(crowi.getConfig()).toEqual({ test: 1 })
    })

    test('model getter, setter', () => {
      // set
      crowi.model('hoge' as any, { fuga: 1 })
      expect(crowi.model('hoge' as any)).toEqual({ fuga: 1 })
    })
  })

  describe('.setupDatabase', () => {
    test('setup completed', () => {
      expect(crowi.getMongo().connection.readyState).toBe(1)
    })
  })

  describe('.normalizeUrl', () => {
    test('get normalized base url', () => {
      // is set on setup.ts
      expect(crowi.getBaseUrl()).toBe('http://localhost:13001')
    })
    test('the url always has slash', () => {
      expect(crowi.normalizeUrl('http://localhost:13001')).toBe('http://localhost:13001')
      expect(crowi.normalizeUrl('http://localhost:13001/')).toBe('http://localhost:13001')
    })
  })
})
