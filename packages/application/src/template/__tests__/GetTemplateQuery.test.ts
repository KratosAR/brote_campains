import { ChannelType, Template, TemplateContent } from '@bcp/domain'
import { GetTemplateQuery } from '../GetTemplateQuery'
import { InMemoryTemplateRepository } from './testDoubles'

describe('GetTemplateQuery', () => {
  it('returns the template when found', async () => {
    const templateRepository = new InMemoryTemplateRepository()
    const content = TemplateContent.create('Hola').getValue()
    const template = Template.create('ws-1', 'Welcome', ChannelType.Email, content).getValue()
    await templateRepository.save(template)
    const query = new GetTemplateQuery(templateRepository)

    const result = await query.execute({
      templateId: template.templateId.toString(),
      workspaceId: 'ws-1',
    })

    expect(result.isOk()).toBe(true)
  })

  it('fails when the template does not exist', async () => {
    const templateRepository = new InMemoryTemplateRepository()
    const query = new GetTemplateQuery(templateRepository)

    const result = await query.execute({ templateId: 'missing', workspaceId: 'ws-1' })

    expect(result.isFail()).toBe(true)
  })
})
