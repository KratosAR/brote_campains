import { useCallback } from 'react'
import { useToast } from './toast'

interface FetchOptions extends RequestInit {
  skipErrorToast?: boolean
}

export function useFetch() {
  const { addToast } = useToast()

  const fetchWithRefresh = useCallback(
    async (url: string, options: FetchOptions = {}) => {
      const { skipErrorToast, ...fetchOptions } = options

      let response = await fetch(url, {
        ...fetchOptions,
        credentials: 'include'
      })

      // If 401, try to refresh token and retry
      if (response.status === 401) {
        try {
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include'
          })

          if (refreshResponse.ok) {
            // Retry original request
            response = await fetch(url, {
              ...fetchOptions,
              credentials: 'include'
            })
          } else {
            // Refresh failed, redirect to login
            if (typeof window !== 'undefined') {
              window.location.href = '/login'
            }
          }
        } catch (error) {
          console.error('Token refresh failed:', error)
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        }
      }

      // Handle other errors
      if (!response.ok && !skipErrorToast) {
        const data = await response.json().catch(() => ({}))
        const errorMessage = data.error || `Error: ${response.status}`
        addToast(errorMessage, 'error')
      }

      return response
    },
    [addToast]
  )

  return { fetch: fetchWithRefresh }
}
