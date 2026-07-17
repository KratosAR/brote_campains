'use client'

import React from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { listChannels, disconnectChannel, type ChannelType } from '@bcp/sdk'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useToast } from '@/lib/toast'
import { ProviderWizard } from '@/components/ProviderWizard'
import { Card } from '@/components/ui/Card'

export default function ChannelsPage() {
  const { workspaceId } = useWorkspace()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [showWizard, setShowWizard] = React.useState(false)
  const [disconnectConfirm, setDisconnectConfirm] = React.useState<ChannelType | null>(null)

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['channels', workspaceId],
    queryFn: () => (workspaceId ? listChannels(workspaceId) : Promise.resolve([])),
    enabled: !!workspaceId,
  })

  const disconnectMutation = useMutation({
    mutationFn: async (channelType: ChannelType) => {
      if (!workspaceId) throw new Error('No workspace ID')
      return disconnectChannel(workspaceId, channelType)
    },
    onSuccess: () => {
      addToast('Channel disconnected', 'success')
      queryClient.invalidateQueries({ queryKey: ['channels', workspaceId] })
      setDisconnectConfirm(null)
    },
    onError: () => {
      addToast('Failed to disconnect channel', 'error')
    },
  })

  if (isLoading) {
    return <div className="text-slate-600">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Channels</h1>
        <p className="text-slate-600 mt-1">Connect communication providers</p>
      </div>

      {!showWizard ? (
        <>
          <Card>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Connected Channels</h2>
              <button
                onClick={() => setShowWizard(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Add Provider
              </button>
            </div>

            {channels.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">No channels connected yet</p>
                <button
                  onClick={() => setShowWizard(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Connect First Channel
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {channels.map((channel) => (
                  <div key={channel.id} className="p-4 border border-slate-200 rounded-lg">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold text-slate-900 capitalize">
                          {channel.channel}
                        </div>
                        <div className="text-sm text-slate-600">{channel.provider}</div>
                      </div>
                      <div
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          channel.status === 'healthy'
                            ? 'bg-green-100 text-green-800'
                            : channel.status === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {channel.status}
                      </div>
                    </div>
                    {channel.lastTestedAt && (
                      <div className="text-xs text-slate-500 mb-3">
                        Tested: {new Date(channel.lastTestedAt).toLocaleDateString()}
                      </div>
                    )}
                    <button
                      onClick={() => setDisconnectConfirm(channel.channel)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Disconnect
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Disconnect Confirmation Modal */}
          {disconnectConfirm && (
            <Card>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-900 mb-4">
                  This will disconnect the channel. Campaigns using this provider will be paused.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => disconnectMutation.mutate(disconnectConfirm)}
                    disabled={disconnectMutation.isPending}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                  <button
                    onClick={() => setDisconnectConfirm(null)}
                    className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </Card>
          )}
        </>
      ) : (
        <div>
          <button
            onClick={() => setShowWizard(false)}
            className="mb-4 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            ← Back
          </button>
          <ProviderWizard
            workspaceId={workspaceId!}
            onSuccess={() => {
              setShowWizard(false)
              queryClient.invalidateQueries({ queryKey: ['channels', workspaceId] })
            }}
          />
        </div>
      )}
    </div>
  )
}
