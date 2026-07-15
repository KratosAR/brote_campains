import { ApiClient } from './client'

export interface RegisterInput {
  ownerName: string
  ownerEmail: string
  ownerPassword: string
  workspaceName: string
  timezone?: string
}

export interface RegisterOutput {
  workspaceId: string
  userId: string
  accessToken: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface LoginOutput {
  workspaceId: string
  userId: string
  accessToken: string
}

export interface User {
  id: string
  email: string
  name: string
  workspaceId: string
}

function getApiClient(): ApiClient {
  const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  return new ApiClient(baseURL)
}

export async function register(input: RegisterInput): Promise<RegisterOutput> {
  const client = getApiClient()
  return client.post('/auth/register', input)
}

export async function login(input: LoginInput): Promise<LoginOutput> {
  const client = getApiClient()
  return client.post('/auth/login', input)
}

export async function logout(): Promise<void> {
  // Route handler will clear cookies and call backend logout
  const response = await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error('Logout failed')
  }
}

export async function refreshToken(): Promise<void> {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error('Token refresh failed')
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const client = getApiClient()
    return await client.get('/auth/me')
  } catch {
    return null
  }
}
