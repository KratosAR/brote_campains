import { z } from 'zod'

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
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
