declare const window: any
declare const document: any

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export class ApiClient {
  private baseURL: string

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') {
    this.baseURL = baseURL
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
    options?: { headers?: Record<string, string> }
  ): Promise<T> {
    const url = new URL(path, this.baseURL)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers
    }

    // Inject bearer token from cookies if available
    if (typeof window !== 'undefined') {
      const token = this.getAccessToken()
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include'
    })

    const responseData = await response.json() as any

    // Handle 401 - token may have expired
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        try {
          await this.refreshToken()
          return this.request<T>(method, path, body, options)
        } catch {
          window.location.href = '/login'
          throw new Error('Session expired')
        }
      }
    }

    if (!response.ok) {
      throw new Error(responseData.error || `HTTP ${response.status}`)
    }

    if (!responseData.success) {
      throw new Error(responseData.error || 'Request failed')
    }

    return responseData.data as T
  }

  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    const match = document.cookie.match(/accessToken=([^;]*)/)
    return match ? match[1] : null
  }

  private async refreshToken(): Promise<void> {
    const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include'
    })

    if (!response.ok) {
      throw new Error('Token refresh failed')
    }
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body)
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path)
  }
}

export const apiClient = new ApiClient()
