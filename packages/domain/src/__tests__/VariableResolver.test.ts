import { resolve } from '../template/VariableResolver'
import { TemplateContent } from '../template/TemplateContent'
import { ValidationError } from '../shared/errors/DomainError'

describe('VariableResolver', () => {
  it('resolves contact, campaign, workspace and custom variables', () => {
    const content = TemplateContent.create(
      'Hola {{contact.firstName}} {{contact.lastName}}, gracias por sumarte a {{campaign.name}} de {{workspace.name}}. Código: {{custom.promoCode}}',
    ).getValue()

    const result = resolve(content, {
      contact: { firstName: 'Ada', lastName: 'Lovelace' },
      campaignName: 'Verano 2026',
      workspaceName: 'Acme',
      custom: { promoCode: 'ABC123' },
    })

    expect(result.isOk()).toBe(true)
    expect(result.getValue()).toBe(
      'Hola Ada Lovelace, gracias por sumarte a Verano 2026 de Acme. Código: ABC123',
    )
  })

  it('resolves today and now to ISO-based strings', () => {
    const content = TemplateContent.create('{{today}} / {{now}}').getValue()

    const result = resolve(content, {})

    expect(result.isOk()).toBe(true)
    expect(result.getValue()).toMatch(/^\d{4}-\d{2}-\d{2} \/ \d{4}-\d{2}-\d{2}T/)
  })

  it('fails with the missing variable name when context does not provide it', () => {
    const content = TemplateContent.create('Hola {{contact.firstName}}').getValue()

    const result = resolve(content, {})

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(ValidationError)
    expect(result.getError().message).toContain('contact.firstName')
  })
})
