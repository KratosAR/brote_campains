import { ChannelType, Template, TemplateContent, TemplateStatus } from '@bcp/domain'
import { ArchiveTemplateCommand } from '../ArchiveTemplateCommand'
import { InMemoryTemplateRepository } from './testDoubles'

describe('ArchiveTemplateCommand', () => {
  it('archives an active template', async () => {
    const templateRepository = new InMemoryTemplateRepository()
    const content = TemplateContent.create('Hola').getValue()
    const template = Template.create('ws-1', 'Welcome', ChannelType.Email, content).getValue()
    await templateRepository.save(template)
    const command = new ArchiveTemplateCommand(templateRepository)

    const result = await command.execute({
      templateId: template.templateId.toString(),
      workspaceId: 'ws-1',
    })

    expect(result.isOk()).toBe(true)
    const saved = templateRepository.templates.get(template.templateId.toString())!
    expect(saved.status).toBe(TemplateStatus.Archived)
  })

  it('fails when already archived', async () => {
    const templateRepository = new InMemoryTemplateRepository()
    const content = TemplateContent.create('Hola').getValue()
    const template = Template.create('ws-1', 'Welcome', ChannelType.Email, content).getValue()
    template.archive()
    await templateRepository.save(template)
    const command = new ArchiveTemplateCommand(templateRepository)

    const result = await command.execute({
      templateId: template.templateId.toString(),
      workspaceId: 'ws-1',
    })

    expect(result.isFail()).toBe(true)
  })
})
