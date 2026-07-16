'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listContacts, createContact, deleteContact, optOutContact, type CreateContactInput } from '@bcp/sdk'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useToast } from '@/lib/toast'
import { Card } from '@/components/ui/Card'

export default function ContactsPage() {
  const { workspaceId } = useWorkspace()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = React.useState(false)
  const [formData, setFormData] = React.useState<CreateContactInput>({
    identity: {},
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)

  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['contacts', workspaceId],
    queryFn: () => (workspaceId ? listContacts(workspaceId) : Promise.resolve({ contacts: [], total: 0 })),
    enabled: !!workspaceId,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error('No workspace ID')
      return createContact(workspaceId, formData)
    },
    onSuccess: () => {
      addToast('Contact created', 'success')
      setShowForm(false)
      setFormData({ identity: {} })
      queryClient.invalidateQueries({ queryKey: ['contacts', workspaceId] })
    },
    onError: () => {
      addToast('Failed to create contact', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (contactId: string) => {
      if (!workspaceId) throw new Error('No workspace ID')
      return deleteContact(workspaceId, contactId)
    },
    onSuccess: () => {
      addToast('Contact deleted', 'success')
      queryClient.invalidateQueries({ queryKey: ['contacts', workspaceId] })
      setDeleteConfirm(null)
    },
    onError: () => {
      addToast('Failed to delete contact', 'error')
    },
  })

  const optOutMutation = useMutation({
    mutationFn: async (contactId: string) => {
      if (!workspaceId) throw new Error('No workspace ID')
      return optOutContact(workspaceId, contactId)
    },
    onSuccess: () => {
      addToast('Contact opted out', 'success')
      queryClient.invalidateQueries({ queryKey: ['contacts', workspaceId] })
    },
    onError: () => {
      addToast('Failed to opt out contact', 'error')
    },
  })

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.identity.firstName && !formData.whatsappPhone && !formData.emailAddress && !formData.smsPhone) {
      newErrors.form = 'At least one field is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      createMutation.mutate()
    }
  }

  if (isLoading) {
    return <div className="text-slate-600">Loading...</div>
  }

  const contacts = contactsData?.contacts || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Contacts</h1>
        <p className="text-slate-600 mt-1">Manage your contact lists ({contacts.length})</p>
      </div>

      {!showForm ? (
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Contacts</h2>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Add Contact
            </button>
          </div>

          {contacts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-600 mb-4">No contacts yet</p>
              <button
                onClick={() => setShowForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add First Contact
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">WhatsApp</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">SMS</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        {contact.identity.firstName || contact.identity.lastName
                          ? `${contact.identity.firstName || ''} ${contact.identity.lastName || ''}`.trim()
                          : '—'}
                      </td>
                      <td className="py-3 px-4">{contact.whatsappPhone || '—'}</td>
                      <td className="py-3 px-4">{contact.emailAddress || '—'}</td>
                      <td className="py-3 px-4">{contact.smsPhone || '—'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            contact.isOptedOut
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {contact.isOptedOut ? 'Opted Out' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-4 space-x-2">
                        {!contact.isOptedOut && (
                          <button
                            onClick={() => optOutMutation.mutate(contact.id)}
                            disabled={optOutMutation.isPending}
                            className="text-sm text-yellow-600 hover:text-yellow-800 disabled:opacity-50"
                          >
                            Opt Out
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteConfirm(contact.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Add Contact</h2>
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">First Name</label>
                <input
                  type="text"
                  value={formData.identity.firstName || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    identity: { ...formData.identity, firstName: e.target.value }
                  })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Last Name</label>
                <input
                  type="text"
                  value={formData.identity.lastName || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    identity: { ...formData.identity, lastName: e.target.value }
                  })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">WhatsApp Phone</label>
              <input
                type="tel"
                value={formData.whatsappPhone || ''}
                onChange={(e) => setFormData({ ...formData, whatsappPhone: e.target.value })}
                placeholder="+1234567890"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={formData.emailAddress || ''}
                onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">SMS Phone</label>
              <input
                type="tel"
                value={formData.smsPhone || ''}
                onChange={(e) => setFormData({ ...formData, smsPhone: e.target.value })}
                placeholder="+1234567890"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              />
            </div>

            {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}
          </form>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Contact'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </Card>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <Card>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-900 mb-4">Are you sure you want to delete this contact?</p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
