import { Template } from '../template/Template'
import { TemplateContent } from '../template/TemplateContent'
import { TemplateStatus } from '../template/TemplateStatus'
import { ChannelType } from '../contact/ChannelType'
import { BusinessRuleViolationError, NotFoundError, ValidationError } from '../shared/errors/DomainError'

function makeContent(body = 'Hola {{nombre}}') {
  return TemplateContent.create(body).getValue()
}

describe('Template', () => {
  it('creates a template with version 1 active', () => {
    const result = Template.create('workspace-1', 'Bienvenida', ChannelType.Email, makeContent())

    expect(result.isOk()).toBe(true)
    const template = result.getValue()
    expect(template.activeVersion).toBe(1)
    expect(template.status).toBe(TemplateStatus.Active)
    expect(template.versions).toHaveLength(1)
  })

  it('rejects creation with an empty name', () => {
    const result = Template.create('workspace-1', '', ChannelType.Email, makeContent())

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(ValidationError)
  })

  it('creates a new version without modifying the previous one', () => {
    const template = Template.create('workspace-1', 'Bienvenida', ChannelType.Email, makeContent()).getValue()
    const originalContent = template.versions[0]!.content

    const result = template.createVersion(makeContent('Hola {{nombre}}, versión 2'))

    expect(result.isOk()).toBe(true)
    expect(template.versions).toHaveLength(2)
    expect(template.versions[0]!.content).toBe(originalContent)
    expect(template.versions[1]!.version).toBe(2)
    expect(template.activeVersion).toBe(1)
  })

  it('activates an existing version', () => {
    const template = Template.create('workspace-1', 'Bienvenida', ChannelType.Email, makeContent()).getValue()
    template.createVersion(makeContent('v2'))

    const result = template.activateVersion(2)

    expect(result.isOk()).toBe(true)
    expect(template.activeVersion).toBe(2)
  })

  it('fails to activate a version that does not exist', () => {
    const template = Template.create('workspace-1', 'Bienvenida', ChannelType.Email, makeContent()).getValue()

    const result = template.activateVersion(99)

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(NotFoundError)
  })

  it('archives an active template', () => {
    const template = Template.create('workspace-1', 'Bienvenida', ChannelType.Email, makeContent()).getValue()

    const result = template.archive()

    expect(result.isOk()).toBe(true)
    expect(template.status).toBe(TemplateStatus.Archived)
  })

  it('fails to archive an already archived template', () => {
    const template = Template.create('workspace-1', 'Bienvenida', ChannelType.Email, makeContent()).getValue()
    template.archive()

    const result = template.archive()

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(BusinessRuleViolationError)
  })

  it('returns the content of the active version', () => {
    const template = Template.create('workspace-1', 'Bienvenida', ChannelType.Email, makeContent()).getValue()
    template.createVersion(makeContent('v2 {{nombre}}'))
    template.activateVersion(2)

    expect(template.getActiveContent().body).toBe('v2 {{nombre}}')
  })
})
