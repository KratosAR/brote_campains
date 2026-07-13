import { ChannelType } from '@bcp/domain'
import { CreateTemplateCommand } from '../CreateTemplateCommand'
import { InMemoryTemplateRepository } from './testDoubles'

describe('CreateTemplateCommand', () => {
  it('creates a template with a first version', async () => {
    const templateRepository = new InMemoryTemplateRepository()
    const command = new CreateTemplateCommand(templateRepository)

    const result = await command.execute({
      workspaceId: 'ws-1',
      name: 'Welcome',
      channel: ChannelType.Email,
      body: 'Hola {{firstName}}',
    })

    expect(result.isOk()).toBe(true)
    expect(templateRepository.templates.size).toBe(1)
  })

  it('rejects an empty name', async () => {
    const templateRepository = new InMemoryTemplateRepository()
    const command = new CreateTemplateCommand(templateRepository)

    const result = await command.execute({
      workspaceId: 'ws-1',
      name: '',
      channel: ChannelType.Email,
      body: 'Hola',
    })

    expect(result.isFail()).toBe(true)
  })
})
