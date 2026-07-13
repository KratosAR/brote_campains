import { Template, TemplateContent, ChannelType } from '@bcp/domain'

import { TemplateMapper, type TemplateRecord } from '../persistence/TemplateMapper'

function makeTemplate(): Template {
  const content = TemplateContent.create('Hi {{name}}').getValue()
  return Template.create('workspace-1', 'Welcome', ChannelType.Email, content).getValue()
}

describe('TemplateMapper', () => {
  it('round-trips a template through toPersistence/toDomain', () => {
    const template = makeTemplate()
    template.createVersion(TemplateContent.create('Hi {{name}}, updated').getValue())

    const { template: data, versions } = TemplateMapper.toPersistence(template)

    const record: TemplateRecord = { ...data, versions } as unknown as TemplateRecord

    const hydrated = TemplateMapper.toDomain(record)

    expect(hydrated.name).toBe('Welcome')
    expect(hydrated.workspaceId).toBe('workspace-1')
    expect(hydrated.channel).toBe(ChannelType.Email)
    expect(hydrated.versions).toHaveLength(2)
    expect(hydrated.versions[0]?.content.body).toBe('Hi {{name}}')
    expect(hydrated.versions[1]?.content.body).toBe('Hi {{name}}, updated')
    expect(hydrated.activeVersion).toBe(1)
  })
})
