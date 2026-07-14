import bcrypt from 'bcrypt'

const SALT_ROUNDS = Math.max(parseInt(process.env.BCRYPT_ROUNDS ?? '6'), 6)

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
