import { ChannelType, Template, TemplateContent } from '@bcp/domain'
import { PreviewTemplateQuery } from '../PreviewTemplateQuery'
import { InMemoryTemplateRepository } from './testDoubles'

describe('PreviewTemplateQuery', () => {
  it('renders the active version with sample values', async () => {
    const templateRepository = new InMemoryTemplateRepository()
    const content = TemplateContent.create('Hola {{firstName}}').getValue()
    const template = Template.create('ws-1', 'Welcome', ChannelType.Email, content).getValue()
    await templateRepository.save(template)
    const query = new PreviewTemplateQuery(templateRepository)

    const result = await query.execute({
      templateId: template.templateId.toString(),
      workspaceId: 'ws-1',
      sampleValues: { firstName: 'Ada' },
    })

    expect(result.isOk()).toBe(true)
    expect(result.getValue()).toBe('Hola Ada')
  })

  it('fails with the missing variable name when a required variable is not provided', async () => {
    const templateRepository = new InMemoryTemplateRepository()
    const content = TemplateContent.create('Hola {{firstName}}').getValue()
    const template = Template.create('ws-1', 'Welcome', ChannelType.Email, content).getValue()
    await templateRepository.save(template)
    const query = new PreviewTemplateQuery(templateRepository)

    const result = await query.execute({
      templateId: template.templateId.toString(),
      workspaceId: 'ws-1',
      sampleValues: {},
    })

    expect(result.isFail()).toBe(true)
    expect(result.getError().message).toContain('firstName')
  })
})
