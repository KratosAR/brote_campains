'use client'

import React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { inviteUser } from '@bcp/sdk'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useToast } from '@/lib/toast'
import { Card } from '@/components/ui/Card'

interface InviteFormData {
  email: string
  role: 'Owner' | 'Admin' | 'Member'
}

export default function UsersPage() {
  const { workspaceId } = useWorkspace()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [formData, setFormData] = React.useState<InviteFormData>({
    email: '',
    role: 'Member',
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteFormData) => {
      if (!workspaceId) throw new Error('No workspace ID')
      return inviteUser(workspaceId, data)
    },
    onSuccess: () => {
      addToast('User invited successfully', 'success')
      setFormData({ email: '', role: 'Member' })
      queryClient.invalidateQueries({ queryKey: ['workspace-users', workspaceId] })
    },
    onError: (error) => {
      addToast(`Failed to invite user: ${error.message}`, 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    inviteMutation.mutate(formData)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Users</h1>
        <p className="text-slate-600 mt-1">Invite and manage workspace members</p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Invite User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="user@example.com"
            />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as InviteFormData['role'] })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="Member">Member</option>
              <option value="Admin">Admin</option>
              <option value="Owner">Owner</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={inviteMutation.isPending}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
          </button>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Workspace Members</h2>
        <div className="text-sm text-slate-600">
          User management features coming soon. Users can accept invitations at their registration link.
        </div>
      </Card>
    </div>
  )
}
