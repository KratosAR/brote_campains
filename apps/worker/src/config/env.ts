import { z } from 'zod'

const schema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
})

export type Env = z.infer<typeof schema>

export function validateEnv(): Env {
  const result = schema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    // eslint-disable-next-line no-console
    console.error('❌ Invalid environment variables:\n' + missing.join('\n'))
    process.exit(1)
  }
  return result.data
}
