import { ApiClient } from './client'

export interface WorkspaceSettings {
  timezone: string
  locale: string
  maxContacts: number
  maxCampaigns: number
}

export interface Workspace {
  id: string
  name: string
  slug: string
  status: string
  settings: WorkspaceSettings
}

export interface WorkspaceUser {
  id: string
  email: string
  name: string
  role: 'Owner' | 'Admin' | 'Member'
}

export interface InviteUserInput {
  email: string
  role: 'Owner' | 'Admin' | 'Member'
}

export interface InviteUserOutput {
  invitationId: string
  email: string
  role: string
  token: string
}

function getApiClient(): ApiClient {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  return new ApiClient(baseURL)
}

export async function getWorkspace(workspaceId: string): Promise<Workspace> {
  const client = getApiClient()
  return client.get(`/workspaces/${workspaceId}`)
}

export async function updateWorkspace(
  workspaceId: string,
  updates: Partial<Workspace>
): Promise<Workspace> {
  const client = getApiClient()
  return client.put(`/workspaces/${workspaceId}`, updates)
}

export async function inviteUser(
  workspaceId: string,
  input: InviteUserInput
): Promise<InviteUserOutput> {
  const client = getApiClient()
  return client.post(`/workspaces/${workspaceId}/users/invite`, input)
}
