import { ChannelType, Template, TemplateContent } from '@bcp/domain'
import { ListTemplatesQuery } from '../ListTemplatesQuery'
import { InMemoryTemplateRepository } from './testDoubles'

describe('ListTemplatesQuery', () => {
  it('lists templates for a workspace', async () => {
    const templateRepository = new InMemoryTemplateRepository()
    const content = TemplateContent.create('Hola').getValue()
    const template = Template.create('ws-1', 'Welcome', ChannelType.Email, content).getValue()
    await templateRepository.save(template)
    const query = new ListTemplatesQuery(templateRepository)

    const result = await query.execute({ workspaceId: 'ws-1', page: 1, limit: 10 })

    expect(result.total).toBe(1)
    expect(result.items).toHaveLength(1)
  })

  it('returns an empty page for another workspace', async () => {
    const templateRepository = new InMemoryTemplateRepository()
    const content = TemplateContent.create('Hola').getValue()
    const template = Template.create('ws-1', 'Welcome', ChannelType.Email, content).getValue()
    await templateRepository.save(template)
    const query = new ListTemplatesQuery(templateRepository)

    const result = await query.execute({ workspaceId: 'ws-2', page: 1, limit: 10 })

    expect(result.total).toBe(0)
  })
})
