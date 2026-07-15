import { Card } from '@/components/ui/Card'

export default function ContactsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Contacts</h1>
        <p className="text-slate-600 mt-1">Manage your contact lists</p>
      </div>

      <Card>
        <p className="text-slate-600">No contacts yet. Start by importing a CSV file.</p>
      </Card>
    </div>
  )
}
