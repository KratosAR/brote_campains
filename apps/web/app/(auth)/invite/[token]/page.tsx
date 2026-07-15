'use client'

import React from 'react'
import { useRouter, useParams } from 'next/navigation'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useToast } from '@/lib/toast'
import { z } from 'zod'

const inviteSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
  password: z
    .string()
    .min(8, 'Contraseña debe tener al menos 8 caracteres')
    .regex(/[A-Z]/, 'Debe contener mayúsculas')
    .regex(/[0-9]/, 'Debe contener números'),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
})


const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export default function InvitePage() {
  const router = useRouter()
  const params = useParams()
  const { addToast } = useToast()
  const token = params.token as string

  const [formData, setFormData] = React.useState({
    name: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = React.useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = React.useState(false)

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
      const validated = inviteSchema.parse(formData)

      const response = await fetch(`${API_BASE}/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: validated.name,
          password: validated.password
        })
      })

      if (!response.ok) {
        const data = await response.json()
        addToast(data.error || 'Invitation failed', 'error')
        return
      }

      // Invitation accepted, redirect to login
      addToast('Invitation accepted! Please log in.', 'success')
      router.push('/login')
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        err.errors.forEach(error => {
          if (error.path[0]) {
            fieldErrors[error.path[0]] = error.message
          }
        })
        setErrors(fieldErrors)
      } else {
        addToast(err instanceof Error ? err.message : 'Invitation failed', 'error')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthLayout title="Accept Invitation">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600 mb-4">
          You&apos;ve been invited to join a workspace. Set your password to get started.
        </p>

        <Input
          label="Full Name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          error={errors.name}
        />

        <Input
          label="Password (min 8 chars, uppercase + number)"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
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
          {isLoading ? 'Accepting...' : 'Accept Invitation'}
        </Button>
      </form>
    </AuthLayout>
  )
}
