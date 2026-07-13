import { ChannelType, Template, TemplateContent } from '@bcp/domain'
import { UpdateTemplateCommand } from '../UpdateTemplateCommand'
import { PreviewTemplateQuery } from '../PreviewTemplateQuery'
import { InMemoryTemplateRepository } from './testDoubles'

async function seedTemplate(templateRepository: InMemoryTemplateRepository) {
  const content = TemplateContent.create('Hola {{firstName}}').getValue()
  const template = Template.create('ws-1', 'Welcome', ChannelType.Email, content).getValue()
  await templateRepository.save(template)
  return template
}

describe('UpdateTemplateCommand', () => {
  it('adds a new version without modifying the previous one', async () => {
    const templateRepository = new InMemoryTemplateRepository()
    const template = await seedTemplate(templateRepository)
    const command = new UpdateTemplateCommand(templateRepository)
    const preview = new PreviewTemplateQuery(templateRepository)

    const result = await command.execute({
      templateId: template.templateId.toString(),
      workspaceId: 'ws-1',
      body: 'Chau {{firstName}}',
    })
    expect(result.isOk()).toBe(true)

    const oldVersion = await preview.execute({
      templateId: template.templateId.toString(),
      workspaceId: 'ws-1',
      version: 1,
      sampleValues: { firstName: 'Ada' },
    })
    expect(oldVersion.isOk()).toBe(true)
    expect(oldVersion.getValue()).toBe('Hola Ada')

    const activeVersion = await preview.execute({
      templateId: template.templateId.toString(),
      workspaceId: 'ws-1',
      sampleValues: { firstName: 'Ada' },
    })
    expect(activeVersion.isOk()).toBe(true)
    expect(activeVersion.getValue()).toBe('Hola Ada')
  })

  it('fails when the template does not exist', async () => {
    const templateRepository = new InMemoryTemplateRepository()
    const command = new UpdateTemplateCommand(templateRepository)

    const result = await command.execute({
      templateId: 'missing',
      workspaceId: 'ws-1',
      body: 'Hola',
    })

    expect(result.isFail()).toBe(true)
  })
})
