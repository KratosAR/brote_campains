import { ProviderError } from '@bcp/contracts'
import { FakeProvider } from '../FakeProvider'

describe('FakeProvider', () => {
  const originalEnv = process.env.FAKE_PROVIDER_SUCCESS_RATE

  afterEach(() => {
    process.env.FAKE_PROVIDER_SUCCESS_RATE = originalEnv
  })

  it('send() resolves with a providerMessageId on the happy path', async () => {
    process.env.FAKE_PROVIDER_SUCCESS_RATE = '1'
    const provider = new FakeProvider()

    const response = await provider.send({ to: '+5491100000000', body: 'hola' })

    expect(response.providerMessageId).toEqual(expect.any(String))
    expect(response.timestamp).toBeInstanceOf(Date)
  })

  it('health() always returns online', async () => {
    const provider = new FakeProvider()

    const health = await provider.health()

    expect(health.status).toBe('online')
    expect(health.latencyMs).toBeGreaterThan(0)
  })

  it('send() always throws ProviderError when success rate is 0', async () => {
    process.env.FAKE_PROVIDER_SUCCESS_RATE = '0'
    const provider = new FakeProvider()

    await expect(provider.send({ to: '+5491100000000', body: 'hola' })).rejects.toThrow(ProviderError)
  })

  it('send() throws ProviderError with a valid kind when it fails', async () => {
    process.env.FAKE_PROVIDER_SUCCESS_RATE = '0'
    const provider = new FakeProvider()

    expect.assertions(2)
    try {
      await provider.send({ to: '+5491100000000', body: 'hola' })
    } catch (error) {
      const providerError = error as ProviderError
      expect(providerError).toBeInstanceOf(ProviderError)
      expect(['TemporaryError', 'PermanentError']).toContain(providerError.kind)
    }
  })
})
