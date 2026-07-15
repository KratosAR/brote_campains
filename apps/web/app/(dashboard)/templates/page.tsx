import { Card } from '@/components/ui/Card'

export default function TemplatesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Templates</h1>
        <p className="text-slate-600 mt-1">Create and manage message templates</p>
      </div>

      <Card>
        <p className="text-slate-600">No templates yet. Create your first template to get started.</p>
      </Card>
    </div>
  )
}
