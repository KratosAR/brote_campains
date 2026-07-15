import { Card } from '@/components/ui/Card'

export default function CampaignsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Campaigns</h1>
        <p className="text-slate-600 mt-1">Create and manage campaigns</p>
      </div>

      <Card>
        <p className="text-slate-600">No campaigns yet. Create your first campaign to get started.</p>
      </Card>
    </div>
  )
}
