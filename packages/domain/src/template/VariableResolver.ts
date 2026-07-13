import { Result } from '../shared/Result'
import { ValidationError } from '../shared/errors/DomainError'
import { TemplateContent } from './TemplateContent'

interface VariableResolverContext {
  contact?: { firstName: string; lastName?: string; company?: string }
  campaignName?: string
  workspaceName?: string
  custom?: Record<string, string>
}

// ponytail: firma simplificada sin Campaign aggregate (no existe hasta Sprint 5); cuando exista,
// envolver este context en un mapper campaign->context en vez de cambiar esta firma
export function resolve(
  content: TemplateContent,
  context: VariableResolverContext,
): Result<string, ValidationError> {
  const missing: string[] = []

  const values: Record<string, string> = {}
  for (const name of content.extractVariables()) {
    const value = resolveVariable(name, context)
    if (value === undefined) {
      missing.push(name)
    } else {
      values[name] = value
    }
  }

  if (missing.length > 0) {
    return Result.fail(new ValidationError(`Missing required variable(s): ${missing.join(', ')}`))
  }

  return content.render(values)
}

function resolveVariable(name: string, context: VariableResolverContext): string | undefined {
  switch (name) {
    case 'contact.firstName':
      return context.contact?.firstName
    case 'contact.lastName':
      return context.contact?.lastName
    case 'contact.company':
      return context.contact?.company
    case 'campaign.name':
      return context.campaignName
    case 'workspace.name':
      return context.workspaceName
    case 'today':
      return new Date().toISOString().slice(0, 10)
    case 'now':
      return new Date().toISOString()
    default:
      if (name.startsWith('custom.')) {
        return context.custom?.[name.slice('custom.'.length)]
      }
      return undefined
  }
}
