import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Contraseña requerida')
})

export const registerSchema = z
  .object({
    ownerName: z.string().min(2, 'Nombre debe tener al menos 2 caracteres'),
    ownerEmail: z.string().email('Email inválido'),
    ownerPassword: z
      .string()
      .min(8, 'Contraseña debe tener al menos 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener mayúsculas')
      .regex(/[0-9]/, 'Debe contener números'),
    confirmPassword: z.string(),
    workspaceName: z.string().min(3, 'Nombre de workspace debe tener al menos 3 caracteres')
  })
  .refine(data => data.ownerPassword === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
  })

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
