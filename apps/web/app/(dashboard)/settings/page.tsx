import { Card } from '@/components/ui/Card'

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Manage your workspace settings</p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Workspace Settings</h2>
        <p className="text-slate-600">Settings coming soon.</p>
      </Card>
    </div>
  )
}
