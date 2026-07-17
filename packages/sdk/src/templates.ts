import { ApiClient } from './client'
import type { ChannelType } from '@bcp/domain'

export interface Template {
  id: string
  workspaceId: string
  name: string
  body: string
  variables: string[]
  status: 'draft' | 'active'
  version: number
  createdAt: string
  updatedAt: string
}

export interface TemplateVersion {
  version: number
  body: string
  variables: string[]
  createdAt: string
}

export interface CreateTemplateInput {
  name: string
  body: string
  channel: ChannelType
}

export interface UpdateTemplateInput {
  name?: string
  body?: string
  status?: 'draft' | 'active'
}

export interface PreviewResult {
  rendered: string
  missingVariables: string[]
}

function getApiClient(): ApiClient {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  return new ApiClient(baseURL)
}

function extractVariables(body: string): string[] {
  const regex = /{{(\w+)}}/g
  const variables = new Set<string>()
  let match: RegExpExecArray | null
  while ((match = regex.exec(body)) !== null) {
    const variable = match[1]
    if (variable) {
      variables.add(variable)
    }
  }
  return Array.from(variables)
}

export async function listTemplates(
  workspaceId: string,
  page = 1,
  limit = 50
): Promise<{ templates: Template[]; total: number }> {
  const client = getApiClient()
  return client.get(
    `/workspaces/${workspaceId}/templates?page=${page}&limit=${limit}`
  )
}

export async function getTemplate(
  workspaceId: string,
  templateId: string
): Promise<Template> {
  const client = getApiClient()
  return client.get(`/workspaces/${workspaceId}/templates/${templateId}`)
}

export async function createTemplate(
  workspaceId: string,
  input: CreateTemplateInput
): Promise<Template> {
  const client = getApiClient()
  const variables = extractVariables(input.body)
  return client.post(`/workspaces/${workspaceId}/templates`, {
    name: input.name,
    body: input.body,
    channel: input.channel,
    variables
  })
}

export async function updateTemplate(
  workspaceId: string,
  templateId: string,
  input: UpdateTemplateInput
): Promise<Template> {
  const client = getApiClient()
  const payload: Record<string, unknown> = { ...input }
  if (input.body) {
    payload.variables = extractVariables(input.body)
  }
  return client.put(`/workspaces/${workspaceId}/templates/${templateId}`, payload)
}

export async function deleteTemplate(
  workspaceId: string,
  templateId: string
): Promise<void> {
  const client = getApiClient()
  await client.delete(`/workspaces/${workspaceId}/templates/${templateId}`)
}

export async function getTemplateVersions(
  workspaceId: string,
  templateId: string
): Promise<TemplateVersion[]> {
  const client = getApiClient()
  return client.get(`/workspaces/${workspaceId}/templates/${templateId}/versions`)
}

export async function previewTemplate(
  workspaceId: string,
  templateId: string,
  variables: Record<string, string>
): Promise<PreviewResult> {
  const client = getApiClient()
  return client.post(`/workspaces/${workspaceId}/templates/${templateId}/preview`, {
    variables
  })
}

export { extractVariables }
