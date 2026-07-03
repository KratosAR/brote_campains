import { Response } from 'express'
import { DomainError } from '@bcp/domain'

const STATUS_BY_CODE: Record<string, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  BUSINESS_RULE_VIOLATION: 409,
}

export function sendDomainError(res: Response, error: DomainError): void {
  const status = STATUS_BY_CODE[error.code] ?? 400
  // Never leak internals — the DomainError message is already user-safe by construction.
  res.status(status).json({ success: false, error: error.message })
}
