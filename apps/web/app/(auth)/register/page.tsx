'use client'

import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/lib/toast'
import { registerSchema } from '@/lib/schemas'
import { ZodError } from 'zod'

export default function RegisterPage() {
  const router = useRouter()
  const { addToast } = useToast()
  const [formData, setFormData] = React.useState({
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    confirmPassword: '',
    workspaceName: ''
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = React.useState(false)
  const [detectedTimezone] = React.useState(() =>
    Intl.DateTimeFormat().resolvedOptions().timeZone
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setIsLoading(true)

    try {
      const validated = registerSchema.parse(formData)

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerName: validated.ownerName,
          ownerEmail: validated.ownerEmail,
          ownerPassword: validated.ownerPassword,
          workspaceName: validated.workspaceName,
          timezone: detectedTimezone
        }),
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await response.json()
        addToast(data.error || 'Registration failed', 'error')
        return
      }

      addToast('Account created successfully', 'success')
      router.push('/')
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: Record<string, string> = {}
        err.errors.forEach(error => {
          if (error.path[0]) {
            fieldErrors[error.path[0]] = error.message
          }
        })
        setErrors(fieldErrors)
      } else {
        addToast(err instanceof Error ? err.message : 'Registration failed', 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout title="Create your account">
      <form onSubmit={handleSubmit} className="space-y-4">
        {detectedTimezone && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm">
            📍 Timezone: <strong>{detectedTimezone}</strong>
          </div>
        )}

        <Input
          label="Your Name"
          type="text"
          name="ownerName"
          value={formData.ownerName}
          onChange={handleChange}
          error={errors.ownerName}
        />

        <Input
          label="Email"
          type="email"
          name="ownerEmail"
          value={formData.ownerEmail}
          onChange={handleChange}
          error={errors.ownerEmail}
        />

        <Input
          label="Workspace Name"
          type="text"
          name="workspaceName"
          value={formData.workspaceName}
          onChange={handleChange}
          error={errors.workspaceName}
        />

        <Input
          label="Password (min 8 chars, uppercase + number)"
          type="password"
          name="ownerPassword"
          value={formData.ownerPassword}
          onChange={handleChange}
          error={errors.ownerPassword}
        />

        <Input
          label="Confirm Password"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          disabled={isLoading}
        >
          {isLoading ? 'Creating account...' : 'Create account'}
        </Button>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
