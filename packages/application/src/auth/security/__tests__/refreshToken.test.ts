import { generateRefreshToken, hashRefreshToken, REFRESH_TOKEN_TTL_MS } from '../refreshToken'

describe('refreshToken', () => {
  it('generates a 32-byte hex token', () => {
    const token = generateRefreshToken()
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generates distinct tokens on each call', () => {
    expect(generateRefreshToken()).not.toBe(generateRefreshToken())
  })

  it('hashes deterministically', () => {
    const token = generateRefreshToken()
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token))
  })

  it('hash never equals the plaintext token', () => {
    const token = generateRefreshToken()
    expect(hashRefreshToken(token)).not.toBe(token)
  })

  it('expires in 30 days', () => {
    expect(REFRESH_TOKEN_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000)
  })
})
