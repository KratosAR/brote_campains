import { ProviderError } from '@bcp/contracts'
import { EvolutionProvider } from '../EvolutionProvider'

const config = { baseUrl: 'https://evo.example.com', apiKey: 'secret', instanceName: 'bcp' }

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'error',
    json: async () => body,
  } as unknown as Response
}

describe('EvolutionProvider', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it('send() with text resolves providerMessageId from key.id', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(200, { key: { id: 'msg-1' } }))
    const provider = new EvolutionProvider(config)

    const response = await provider.send({ to: '+5491100000000', body: 'hola' })

    expect(response.providerMessageId).toBe('msg-1')
    expect(response.timestamp).toBeInstanceOf(Date)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/message/sendText/bcp'),
      expect.objectContaining({ headers: expect.objectContaining({ apikey: 'secret' }) }),
    )
  })

  it('send() with mediaUrl calls sendMedia endpoint', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(200, { key: { id: 'msg-2' } }))
    const provider = new EvolutionProvider(config)

    await provider.send({ to: '+5491100000000', body: 'caption', mediaUrl: 'https://img.example.com/a.png' })

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/message/sendMedia/bcp'), expect.anything())
  })

  it.each([
    [429, 'RateLimitError'],
    [401, 'AuthError'],
    [500, 'TemporaryError'],
    [400, 'PermanentError'],
  ])('send() maps status %i to %s', async (status, kind) => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(status as number, { message: 'boom' }))
    const provider = new EvolutionProvider(config)

    expect.assertions(2)
    try {
      await provider.send({ to: '+5491100000000', body: 'hola' })
    } catch (error) {
      const providerError = error as ProviderError
      expect(providerError).toBeInstanceOf(ProviderError)
      expect(providerError.kind).toBe(kind)
    }
  })

  it('health() returns online when instance state is open', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(200, { instance: { state: 'open' } }))
    const provider = new EvolutionProvider(config)

    const health = await provider.health()

    expect(health.status).toBe('online')
  })

  it('health() returns offline when the request fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'))
    const provider = new EvolutionProvider(config)

    const health = await provider.health()

    expect(health.status).toBe('offline')
  })

  it('connect() throws AuthError when instance is not authenticated', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(200, { instance: { state: 'close' } }))
    const provider = new EvolutionProvider(config)

    await expect(provider.connect()).rejects.toThrow(ProviderError)
    await expect(provider.connect()).rejects.toMatchObject({ kind: 'AuthError' })
  })

  it('connect() with per-connection credentials uses those instead of the constructor config', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(200, { instance: { state: 'open' } }))
    const provider = new EvolutionProvider(config)

    await provider.connect({ baseUrl: 'https://other.example.com', apiKey: 'other-key', instanceName: 'other' })

    expect(global.fetch).toHaveBeenCalledWith(
      'https://other.example.com/instance/connectionState/other',
      expect.objectContaining({ headers: { apikey: 'other-key' } }),
    )
  })

  it.each(['http://127.0.0.1:8080', 'http://localhost:8080', 'http://169.254.169.254', 'http://10.0.0.5', 'http://192.168.1.1'])(
    'rejects a baseUrl pointing to a private/loopback host (%s) as PermanentError',
    async (baseUrl) => {
      global.fetch = jest.fn()
      const provider = new EvolutionProvider({ ...config, baseUrl })

      await expect(provider.connect()).rejects.toMatchObject({ kind: 'PermanentError' })
      expect(global.fetch).not.toHaveBeenCalled()
    },
  )
})
