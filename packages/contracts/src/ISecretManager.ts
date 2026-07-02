export interface ISecretManager {
  get(key: string): Promise<string>
}
