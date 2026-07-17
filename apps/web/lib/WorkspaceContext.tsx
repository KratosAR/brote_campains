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

function extractWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem('workspaceId')
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaceId] = React.useState(() => extractWorkspaceId())

  return (
    <WorkspaceContext.Provider value={{ workspaceId }}>
      {children}
    </WorkspaceContext.Provider>
  )
}
