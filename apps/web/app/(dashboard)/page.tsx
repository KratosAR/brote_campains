import { Card } from '@/components/ui/Card'

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-1">Welcome to BROTE</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-sm text-slate-600">Total Contacts</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">0</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-600">Campaigns</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">0</div>
        </Card>
        <Card>
          <div className="text-sm text-slate-600">Messages Sent</div>
          <div className="text-3xl font-bold text-slate-900 mt-2">0</div>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Next Steps</h2>
        <ul className="space-y-3">
          <li className="text-slate-700">1. Connect a communication channel (WhatsApp, Email, or SMS)</li>
          <li className="text-slate-700">2. Import your contacts</li>
          <li className="text-slate-700">3. Create message templates</li>
          <li className="text-slate-700">4. Launch your first campaign</li>
        </ul>
      </Card>
    </div>
  )
}
