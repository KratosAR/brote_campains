'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listTemplates, createTemplate, deleteTemplate, previewTemplate, extractVariables, type CreateTemplateInput } from '@bcp/sdk'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useToast } from '@/lib/toast'
import { Card } from '@/components/ui/Card'

type TemplateView = 'list' | 'create' | 'preview'

export default function TemplatesPage() {
  const { workspaceId } = useWorkspace()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [view, setView] = React.useState<TemplateView>('list')
  const [previewTemplateId, setPreviewTemplateId] = React.useState<string | null>(null)
  const [formData, setFormData] = React.useState<CreateTemplateInput>({
    name: '',
    body: ''
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)
  const [previewVars, setPreviewVars] = React.useState<Record<string, string>>({})
  const [previewResult, setPreviewResult] = React.useState<{ rendered: string; missingVariables: string[] } | null>(null)

  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['templates', workspaceId],
    queryFn: () => (workspaceId ? listTemplates(workspaceId) : Promise.resolve({ templates: [], total: 0 })),
    enabled: !!workspaceId,
  })

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error('No workspace ID')
      return createTemplate(workspaceId, formData)
    },
    onSuccess: () => {
      addToast('Template created', 'success')
      setView('list')
      setFormData({ name: '', body: '' })
      queryClient.invalidateQueries({ queryKey: ['templates', workspaceId] })
    },
    onError: () => {
      addToast('Failed to create template', 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (templateId: string) => {
      if (!workspaceId) throw new Error('No workspace ID')
      return deleteTemplate(workspaceId, templateId)
    },
    onSuccess: () => {
      addToast('Template deleted', 'success')
      queryClient.invalidateQueries({ queryKey: ['templates', workspaceId] })
      setDeleteConfirm(null)
    },
    onError: () => {
      addToast('Failed to delete template', 'error')
    },
  })

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!workspaceId || !previewTemplateId) throw new Error('Missing data')
      return previewTemplate(workspaceId, previewTemplateId, previewVars)
    },
    onSuccess: (data) => {
      setPreviewResult(data)
    },
    onError: () => {
      addToast('Preview failed', 'error')
    },
  })

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required'
    }
    if (!formData.body.trim()) {
      newErrors.body = 'Template body is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      createMutation.mutate()
    }
  }

  const variables = extractVariables(formData.body)

  if (isLoading) {
    return <div className="text-slate-600">Loading...</div>
  }

  const templates = templatesData?.templates || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Templates</h1>
        <p className="text-slate-600 mt-1">Create and manage message templates ({templates.length})</p>
      </div>

      {view === 'list' && (
        <>
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Templates</h2>
              <button
                onClick={() => setView('create')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Create Template
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">No templates yet</p>
                <button
                  onClick={() => setView('create')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create First Template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="p-4 border border-slate-200 rounded-lg hover:border-blue-400">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-slate-900">{template.name}</div>
                        <div className="text-xs text-slate-500">v{template.version}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        template.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {template.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-3 mb-3">{template.body}</p>
                    {template.variables.length > 0 && (
                      <div className="text-xs text-slate-500 mb-3">
                        Variables: {template.variables.join(', ')}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setPreviewTemplateId(template.id)
                          setPreviewVars({})
                          setPreviewResult(null)
                          setView('preview')
                        }}
                        className="flex-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        Preview
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(template.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Delete Confirmation */}
          {deleteConfirm && (
            <Card>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-900 mb-4">Are you sure you want to delete this template?</p>
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
        </>
      )}

      {view === 'create' && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Create Template</h2>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Template Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="e.g., Welcome Message"
              />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Template Body (use {'{{variable}}'} for placeholders)
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                rows={8}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 font-mono text-sm"
                placeholder="Hello {{firstName}}, welcome to our service!"
              />
              {errors.body && <p className="text-sm text-red-600 mt-1">{errors.body}</p>}
            </div>

            {variables.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm font-medium text-blue-900">Variables found:</div>
                <div className="text-sm text-blue-800 mt-1">{variables.join(', ')}</div>
              </div>
            )}
          </form>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Template'}
            </button>
            <button
              onClick={() => {
                setView('list')
                setFormData({ name: '', body: '' })
                setErrors({})
              }}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </Card>
      )}

      {view === 'preview' && previewTemplateId && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Preview Template</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Variables Form */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Test Variables</h3>
              <div className="space-y-3">
                {extractVariables(templates.find(t => t.id === previewTemplateId)?.body || '').map((variable) => (
                  <div key={variable}>
                    <label className="block text-sm font-medium text-slate-700">{variable}</label>
                    <input
                      type="text"
                      value={previewVars[variable] || ''}
                      onChange={(e) => setPreviewVars({ ...previewVars, [variable]: e.target.value })}
                      className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 text-sm"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => previewMutation.mutate()}
                disabled={previewMutation.isPending}
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {previewMutation.isPending ? 'Generating...' : 'Generate Preview'}
              </button>
            </div>

            {/* Preview Output */}
            <div>
              <h3 className="font-semibold text-slate-900 mb-4">Preview Output</h3>
              {previewResult && (
                <div className="space-y-3">
                  <div className="p-3 bg-slate-100 rounded-lg font-mono text-sm text-slate-900 whitespace-pre-wrap break-words">
                    {previewResult.rendered}
                  </div>
                  {previewResult.missingVariables.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="text-sm font-medium text-yellow-900">Missing variables:</div>
                      <div className="text-sm text-yellow-800 mt-1">{previewResult.missingVariables.join(', ')}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={() => {
                setView('list')
                setPreviewTemplateId(null)
                setPreviewVars({})
                setPreviewResult(null)
              }}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              ← Back
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}
