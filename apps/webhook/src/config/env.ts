import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3002),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  WEBHOOK_VERIFY_TOKEN: z.string().min(1, 'WEBHOOK_VERIFY_TOKEN is required'),
  META_APP_SECRET: z.string().min(1, 'META_APP_SECRET is required'),
  // Evolution API no firma sus webhooks — este secreto compartido (query param `?token=`)
  // es la única forma de que el endpoint no quede totalmente abierto.
  EVOLUTION_WEBHOOK_SECRET: z.string().min(1, 'EVOLUTION_WEBHOOK_SECRET is required'),
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
