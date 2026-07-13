import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

export class CredentialEncryption {
  private readonly key: Buffer

  constructor(key: string) {
    // ponytail: derivar con sha256 en vez de exigir al operador un ENCRYPTION_KEY
    // de exactamente 32 bytes — más simple y siempre da el largo correcto.
    this.key = createHash('sha256').update(key).digest()
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, this.key, iv)
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`
  }

  decrypt(ciphertext: string): string {
    const parts = ciphertext.split(':')
    const ivHex = parts[0] ?? ''
    const authTagHex = parts[1] ?? ''
    const dataHex = parts[2] ?? ''
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(ivHex, 'hex'))
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
    const plaintext = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()])
    return plaintext.toString('utf8')
  }
}
