import { ApiClient } from './client'

export type ChannelType = 'whatsapp' | 'email' | 'sms'
export type ProviderName =
  | 'meta'
  | 'evolution'
  | 'smtp'
  | 'twilio'

export interface ChannelConnection {
  id: string
  channel: ChannelType
  provider: ProviderName
  isActive: boolean
  lastTestedAt?: string
  status: 'healthy' | 'error' | 'pending'
}

export interface TestConnectionInput {
  channel: ChannelType
  provider: ProviderName
  credentials: Record<string, string>
}

export interface ConnectChannelInput {
  channel: ChannelType
  provider: ProviderName
  credentials: Record<string, string>
}

export interface HealthCheckResult {
  status: 'healthy' | 'error'
  message: string
  timestamp: string
}

function getApiClient(): ApiClient {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  return new ApiClient(baseURL)
}

export async function listChannels(
  workspaceId: string
): Promise<ChannelConnection[]> {
  const client = getApiClient()
  return client.get(`/workspaces/${workspaceId}/channels`)
}

export async function testConnection(
  workspaceId: string,
  input: TestConnectionInput
): Promise<HealthCheckResult> {
  const client = getApiClient()
  return client.post(`/workspaces/${workspaceId}/channels/test-connection`, input)
}

export async function connectChannel(
  workspaceId: string,
  input: ConnectChannelInput
): Promise<ChannelConnection> {
  const client = getApiClient()
  return client.post(`/workspaces/${workspaceId}/channels/connect`, input)
}

export async function disconnectChannel(
  workspaceId: string,
  channel: ChannelType
): Promise<void> {
  const client = getApiClient()
  await client.delete(`/workspaces/${workspaceId}/channels/${channel}`)
}

export async function healthCheckChannel(
  workspaceId: string,
  connectionId: string
): Promise<HealthCheckResult> {
  const client = getApiClient()
  return client.post(
    `/workspaces/${workspaceId}/channels/${connectionId}/health-check`,
    {}
  )
}
