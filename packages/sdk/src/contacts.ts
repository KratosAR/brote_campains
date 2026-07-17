import { ApiClient } from './client'

export interface Contact {
  id: string
  workspaceId: string
  identity: {
    firstName?: string
    lastName?: string
  }
  whatsappPhone?: string
  emailAddress?: string
  smsPhone?: string
  telegramId?: string
  isOptedOut: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateContactInput {
  identity: {
    firstName?: string
    lastName?: string
  }
  whatsappPhone?: string
  emailAddress?: string
  smsPhone?: string
  telegramId?: string
}

export type UpdateContactInput = Partial<CreateContactInput>

export interface ContactGroup {
  id: string
  name: string
  description?: string
  contactCount: number
}

export interface CreateGroupInput {
  name: string
  description?: string
}

export interface ImportJobStatus {
  jobId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  totalRecords: number
  processedRecords: number
  failedRecords: number
  progress: number
}

function getApiClient(): ApiClient {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  return new ApiClient(baseURL)
}

export async function listContacts(
  workspaceId: string,
  page = 1,
  limit = 50
): Promise<{ contacts: Contact[]; total: number }> {
  const client = getApiClient()
  return client.get(
    `/workspaces/${workspaceId}/contacts?page=${page}&limit=${limit}`
  )
}

export async function searchContacts(
  workspaceId: string,
  query: string
): Promise<Contact[]> {
  const client = getApiClient()
  return client.get(
    `/workspaces/${workspaceId}/contacts?search=${encodeURIComponent(query)}`
  )
}

export async function getContact(
  workspaceId: string,
  contactId: string
): Promise<Contact> {
  const client = getApiClient()
  return client.get(`/workspaces/${workspaceId}/contacts/${contactId}`)
}

export async function createContact(
  workspaceId: string,
  input: CreateContactInput
): Promise<Contact> {
  const client = getApiClient()
  return client.post(`/workspaces/${workspaceId}/contacts`, input)
}

export async function updateContact(
  workspaceId: string,
  contactId: string,
  input: UpdateContactInput
): Promise<Contact> {
  const client = getApiClient()
  return client.put(`/workspaces/${workspaceId}/contacts/${contactId}`, input)
}

export async function deleteContact(
  workspaceId: string,
  contactId: string
): Promise<void> {
  const client = getApiClient()
  await client.delete(`/workspaces/${workspaceId}/contacts/${contactId}`)
}

export async function optOutContact(
  workspaceId: string,
  contactId: string
): Promise<Contact> {
  const client = getApiClient()
  return client.post(`/workspaces/${workspaceId}/contacts/${contactId}/opt-out`, {})
}

export async function importContacts(
  workspaceId: string,
  file: File,
  columnMapping: Record<string, string>
): Promise<ImportJobStatus> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('columnMapping', JSON.stringify(columnMapping))

  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  const response = await fetch(
    `${baseURL}/workspaces/${workspaceId}/contacts/import`,
    {
      method: 'POST',
      body: formData,
      credentials: 'include'
    }
  )

  if (!response.ok) {
    throw new Error('Import failed')
  }

  const data = await response.json() as any
  return data.data
}

export async function getImportJobStatus(
  workspaceId: string,
  jobId: string
): Promise<ImportJobStatus> {
  const client = getApiClient()
  return client.get(`/workspaces/${workspaceId}/contacts/import/${jobId}`)
}

export async function listGroups(workspaceId: string): Promise<ContactGroup[]> {
  const client = getApiClient()
  return client.get(`/workspaces/${workspaceId}/contact-groups`)
}

export async function createGroup(
  workspaceId: string,
  input: CreateGroupInput
): Promise<ContactGroup> {
  const client = getApiClient()
  return client.post(`/workspaces/${workspaceId}/contact-groups`, input)
}
