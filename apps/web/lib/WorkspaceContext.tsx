'use client'

import React, { createContext, useContext } from 'react'

interface WorkspaceContextType {
  workspaceId: string | null
}

const WorkspaceContext = createContext<WorkspaceContextType>({ workspaceId: null })

export function useWorkspace() {
  const context = useContext(WorkspaceContext)
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  return context
}

function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const decoded = JSON.parse(atob(parts[1]))
    return decoded
  } catch {
    return null
  }
}

function extractWorkspaceIdFromToken(): string | null {
  if (typeof window === 'undefined') return null

  try {
    const match = document.cookie.match(/accessToken=([^;]*)/)
    if (!match) return null

    const token = match[1]
    const decoded = decodeJWT(token)
    if (!decoded) return null

    return (decoded.workspaceId as string) || null
  } catch {
    return null
  }
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaceId] = React.useState(() => extractWorkspaceIdFromToken())

  return (
    <WorkspaceContext.Provider value={{ workspaceId }}>
      {children}
    </WorkspaceContext.Provider>
  )
}
