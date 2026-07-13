import { TemplateContent } from '../template/TemplateContent'
import { ValidationError } from '../shared/errors/DomainError'

describe('TemplateContent', () => {
  it('renders a body replacing variables with values', () => {
    const content = TemplateContent.create('Hola {{nombre}}, tu pedido está listo').getValue()

    const result = content.render({ nombre: 'Gonzalo' })

    expect(result.isOk()).toBe(true)
    expect(result.getValue()).toBe('Hola Gonzalo, tu pedido está listo')
  })

  it('fails to render when a required variable is missing', () => {
    const content = TemplateContent.create('Hola {{nombre}}').getValue()

    const result = content.render({})

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(ValidationError)
    expect(result.getError().message).toContain('nombre')
  })

  it('rejects a body with unbalanced braces', () => {
    const result = TemplateContent.create('Hola {{nombre')

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(ValidationError)
  })

  it('extracts unique variable names from the body', () => {
    const content = TemplateContent.create('{{nombre}} - {{nombre}} - {{empresa}}').getValue()

    expect(content.extractVariables()).toEqual(['nombre', 'empresa'])
  })
})
