import { hashPassword, verifyPassword } from '../passwordHasher'

describe('passwordHasher', () => {
  it('hashes with bcrypt', async () => {
    const hash = await hashPassword('correct-horse-battery-staple')
    // Cost factor varies by environment (6 in dev, 12+ in prod) — just verify it's a bcrypt hash
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/)
  })

  it('verifies a matching password', async () => {
    const hash = await hashPassword('s3cret-passw0rd')
    await expect(verifyPassword('s3cret-passw0rd', hash)).resolves.toBe(true)
  })

  it('rejects a non-matching password', async () => {
    const hash = await hashPassword('s3cret-passw0rd')
    await expect(verifyPassword('wrong-password', hash)).resolves.toBe(false)
  })

  it('never stores the plaintext password in the hash', async () => {
    const hash = await hashPassword('s3cret-passw0rd')
    expect(hash).not.toContain('s3cret-passw0rd')
  })
})
