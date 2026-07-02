import { ISecretManager } from '@bcp/contracts'

export class EnvSecretManager implements ISecretManager {
  async get(key: string): Promise<string> {
    const value = process.env[key]
    if (!value) throw new Error(`Secret "${key}" not found in environment`)
    return value
  }
}
