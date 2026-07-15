import { ZodError } from 'zod'

export interface ValidationError {
  field: string
  message: string
}

export function formatValidationErrors(error: ZodError): ValidationError[] {
  return error.issues.map(issue => {
    const field = issue.path.join('.')
    let message = issue.message

    // More user-friendly messages
    if (issue.code === 'too_small') {
      const minLength = (issue as any).minimum
      message = `${field} must be at least ${minLength} character${minLength > 1 ? 's' : ''}`
    } else if (issue.code === 'invalid_email') {
      message = `${field} must be a valid email address`
    } else if (issue.code === 'invalid_string') {
      message = `${field} is invalid`
    }

    return { field, message }
  })
}

export function toErrorResponse(errors: ValidationError[]) {
  if (errors.length === 1) {
    return { success: false, error: errors[0]?.message }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { success: false, errors: errors as any }
}
