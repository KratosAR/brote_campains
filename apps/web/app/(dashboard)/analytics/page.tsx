import { Card } from '@/components/ui/Card'

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-600 mt-1">View campaign performance metrics</p>
      </div>

      <Card>
        <p className="text-slate-600">No analytics available yet. Run a campaign to see performance data.</p>
      </Card>
    </div>
  )
}
