'use client'

import { useQuery } from '@tanstack/react-query'
import { getWorkspace } from '@bcp/sdk'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { Card } from '@/components/ui/Card'

export default function DashboardPage() {
  const { workspaceId } = useWorkspace()

  const { data: workspace, isLoading } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => workspaceId ? getWorkspace(workspaceId) : Promise.reject(new Error('No workspace ID')),
    enabled: !!workspaceId,
  })

  if (isLoading) {
    return <div className="text-slate-600">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Welcome to {workspace?.name || 'BROTE'}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-sm text-slate-600">Workspace</div>
          <div className="text-lg font-semibold text-slate-900 mt-2">{workspace?.name || '-'}</div>
          <div className="text-xs text-slate-500 mt-1">ID: {workspace?.id}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-600">Status</div>
          <div className="text-lg font-semibold text-slate-900 mt-2">{workspace?.status || 'N/A'}</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-600">Timezone</div>
          <div className="text-lg font-semibold text-slate-900 mt-2">{workspace?.settings.timezone || 'N/A'}</div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Getting Started</h2>
        <ul className="space-y-3">
          <li className="text-slate-700">1. <a href="/channels" className="text-blue-600 hover:underline">Connect a communication channel</a> (WhatsApp, Email, or SMS)</li>
          <li className="text-slate-700">2. <a href="/contacts" className="text-blue-600 hover:underline">Import your contacts</a></li>
          <li className="text-slate-700">3. <a href="/templates" className="text-blue-600 hover:underline">Create message templates</a></li>
          <li className="text-slate-700">4. <a href="/campaigns" className="text-blue-600 hover:underline">Launch your first campaign</a></li>
        </ul>
      </Card>
    </div>
  )
}
