import { ProviderError } from '@bcp/contracts'
import { MetaProvider } from '../MetaProvider'

function mockFetchOnce(status: number, body: unknown): void {
  jest.spyOn(global, 'fetch').mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'status',
    json: async () => body,
  } as Response)
}

describe('MetaProvider', () => {
  const provider = new MetaProvider({
    phoneNumberId: '123',
    accessToken: 'token',
    webhookVerifyToken: 'verify',
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('send() texto simple happy path', async () => {
    mockFetchOnce(200, { messages: [{ id: 'wamid.1' }] })
    const res = await provider.send({ to: '54911', body: 'hola' })
    expect(res.providerMessageId).toBe('wamid.1')
    expect(res.timestamp).toBeInstanceOf(Date)
  })

  it('send() con template', async () => {
    mockFetchOnce(200, { messages: [{ id: 'wamid.2' }] })
    await provider.send({
      to: '54911',
      body: '',
      templateName: 'bienvenida',
      templateLanguage: 'es',
      templateVariables: { name: 'Gonza' },
    })
    const call = (global.fetch as jest.Mock).mock.calls[0]
    const sentBody = JSON.parse(call[1].body)
    expect(sentBody.type).toBe('template')
    expect(sentBody.template.name).toBe('bienvenida')
    expect(sentBody.template.components[0].parameters[0]).toEqual({ type: 'text', text: 'Gonza' })
  })

  it('mapea 429 a RateLimitError', async () => {
    mockFetchOnce(429, { error: { message: 'too many' } })
    await expect(provider.send({ to: '1', body: 'x' })).rejects.toMatchObject({
      kind: 'RateLimitError',
    } satisfies Partial<ProviderError>)
  })

  it('mapea 401 a AuthError', async () => {
    mockFetchOnce(401, { error: { message: 'bad token' } })
    await expect(provider.send({ to: '1', body: 'x' })).rejects.toMatchObject({ kind: 'AuthError' })
  })

  it('mapea 500 a TemporaryError', async () => {
    mockFetchOnce(500, { error: { message: 'server error' } })
    await expect(provider.send({ to: '1', body: 'x' })).rejects.toMatchObject({ kind: 'TemporaryError' })
  })

  it('mapea 400 a PermanentError', async () => {
    mockFetchOnce(400, { error: { message: 'invalid number' } })
    await expect(provider.send({ to: '1', body: 'x' })).rejects.toMatchObject({ kind: 'PermanentError' })
  })

  it('health() online', async () => {
    mockFetchOnce(200, {})
    const status = await provider.health()
    expect(status.status).toBe('online')
  })

  it('health() offline si la request falla', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('network down'))
    const status = await provider.health()
    expect(status.status).toBe('offline')
  })

  it('connect() con token invalido lanza AuthError', async () => {
    mockFetchOnce(401, { error: { message: 'invalid token' } })
    await expect(provider.connect()).rejects.toThrow(ProviderError)
    await expect(async () => {
      mockFetchOnce(401, { error: { message: 'invalid token' } })
      await provider.connect()
    }).rejects.toMatchObject({ kind: 'AuthError' })
  })
})
