import { Card } from '@/components/ui/Card'

export default function ChannelsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Channels</h1>
        <p className="text-slate-600 mt-1">Connect communication channels</p>
      </div>

      <Card>
        <p className="text-slate-600">No channels connected. Connect WhatsApp, Email, or SMS to get started.</p>
      </Card>
    </div>
  )
}
