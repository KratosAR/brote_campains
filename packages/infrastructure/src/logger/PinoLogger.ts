import pino, { Logger } from 'pino'
import { ILogger } from '@bcp/contracts'
import { RequestContext } from '../context/RequestContext'

function createPinoInstance(): Logger {
  if (process.env.NODE_ENV !== 'production') {
    return pino({
      transport: { target: 'pino-pretty', options: { colorize: true } },
      level: process.env.LOG_LEVEL ?? 'info',
    })
  }
  return pino({ level: process.env.LOG_LEVEL ?? 'info' })
}

export class PinoLogger implements ILogger {
  private readonly logger: Logger

  constructor() {
    this.logger = createPinoInstance()
  }

  private ctx(): Record<string, unknown> {
    return { correlationId: RequestContext.getCorrelationId() }
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.logger.info({ ...this.ctx(), ...context }, message)
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.logger.warn({ ...this.ctx(), ...context }, message)
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    this.logger.error({ ...this.ctx(), ...context, err: error }, message)
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.logger.debug({ ...this.ctx(), ...context }, message)
  }
}
