import { CredentialEncryption } from '../security/CredentialEncryption'

describe('CredentialEncryption', () => {
  const encryption = new CredentialEncryption('test-key-not-32-bytes')

  it('round-trips plaintext through encrypt/decrypt', () => {
    const plaintext = JSON.stringify({ apiKey: 'secret-123' })
    const ciphertext = encryption.encrypt(plaintext)

    expect(encryption.decrypt(ciphertext)).toBe(plaintext)
  })

  it('produces different ciphertext for different plaintexts', () => {
    const a = encryption.encrypt('hello')
    const b = encryption.encrypt('world')

    expect(a).not.toBe(b)
  })

  it('produces different ciphertext for the same plaintext (random iv)', () => {
    const a = encryption.encrypt('same-text')
    const b = encryption.encrypt('same-text')

    expect(a).not.toBe(b)
    expect(encryption.decrypt(a)).toBe('same-text')
    expect(encryption.decrypt(b)).toBe('same-text')
  })
})
