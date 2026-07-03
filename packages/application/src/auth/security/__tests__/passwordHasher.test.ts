import { hashPassword, verifyPassword } from '../passwordHasher'

describe('passwordHasher', () => {
  it('hashes with bcrypt cost factor 12', async () => {
    const hash = await hashPassword('correct-horse-battery-staple')
    expect(hash).toMatch(/^\$2[aby]\$12\$/)
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
