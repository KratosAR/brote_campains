import { ValueObject } from '../shared/ValueObject'
import { Result } from '../shared/Result'
import { ValidationError } from '../shared/errors/DomainError'
import { TemplateVariable } from './TemplateVariable'

interface TemplateContentProps {
  body: string
  variables: TemplateVariable[]
}

const VARIABLE_PATTERN = /\{\{([\w.]+)\}\}/g

// ponytail: chequeo de balance con scan lineal char a char, sin soporte de anidado
// (el spec no lo pide). Si algún día se necesitan llaves anidadas, reemplazar por un parser real.
function hasBalancedBraces(body: string): boolean {
  let open = false
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '{' && body[i + 1] === '{') {
      if (open) return false
      open = true
      i++
    } else if (body[i] === '}' && body[i + 1] === '}') {
      if (!open) return false
      open = false
      i++
    }
  }
  return !open
}

export class TemplateContent extends ValueObject<TemplateContentProps> {
  private constructor(props: TemplateContentProps) {
    super(props)
  }

  static create(
    body: string,
    variables?: TemplateVariable[],
  ): Result<TemplateContent, ValidationError> {
    if (!hasBalancedBraces(body)) {
      return Result.fail(new ValidationError('Template body has unbalanced variable braces', 'body'))
    }

    const resolvedVariables =
      variables ??
      Array.from(new Set(Array.from(body.matchAll(VARIABLE_PATTERN)).map((m) => m[1] as string))).map(
        (name) => TemplateVariable.create(name, true),
      )

    return Result.ok(new TemplateContent({ body, variables: resolvedVariables }))
  }

  get body(): string {
    return this.props.body
  }

  get variables(): TemplateVariable[] {
    return [...this.props.variables]
  }

  extractVariables(): string[] {
    return Array.from(
      new Set(Array.from(this.props.body.matchAll(VARIABLE_PATTERN)).map((m) => m[1] as string)),
    )
  }

  render(values: Record<string, string>): Result<string, ValidationError> {
    const missing: string[] = []

    const rendered = this.props.body.replace(VARIABLE_PATTERN, (_match, name: string) => {
      if (values[name] !== undefined) return values[name]

      const variable = this.props.variables.find((v) => v.name === name)
      if (variable?.defaultValue !== undefined) return variable.defaultValue
      if (variable?.required === false) return ''

      missing.push(name)
      return ''
    })

    if (missing.length > 0) {
      return Result.fail(new ValidationError(`Missing required variable(s): ${missing.join(', ')}`))
    }

    return Result.ok(rendered)
  }
}
