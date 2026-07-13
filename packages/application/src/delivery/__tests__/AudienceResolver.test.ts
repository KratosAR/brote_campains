import { Campaign, CampaignAudience, Contact, ContactIdentity, ContactChannel, ChannelType } from '@bcp/domain'
import { InMemoryContactRepository, InMemoryGroupRepository } from '../../contact/__tests__/testDoubles'
import { resolve } from '../AudienceResolver'

const WORKSPACE_ID = 'ws-1'

function makeContact(opts: {
  firstName?: string
  channelType?: ChannelType
  channelValue?: string
  optedOut?: boolean
}): Contact {
  const identity = ContactIdentity.create({ firstName: opts.firstName ?? 'Ana' }).getValue()
  const channel = ContactChannel.create(
    opts.channelType ?? ChannelType.Email,
    opts.channelValue ?? 'ana@example.com',
  ).getValue()
  const contact = Contact.create(WORKSPACE_ID, identity, [channel]).getValue()
  if (opts.optedOut) contact.optOut()
  return contact
}

function makeCampaign(audience: CampaignAudience, channel: ChannelType = ChannelType.Email): Campaign {
  return Campaign.createDraft(WORKSPACE_ID, 'Campaign', channel, audience, 'template-1').getValue()
}

describe('AudienceResolver', () => {
  let contactRepository: InMemoryContactRepository
  let groupRepository: InMemoryGroupRepository

  beforeEach(() => {
    contactRepository = new InMemoryContactRepository()
    groupRepository = new InMemoryGroupRepository()
  })

  it('resuelve audiencia "all" y filtra opt-out', async () => {
    const active = makeContact({})
    const optedOut = makeContact({ optedOut: true })
    await contactRepository.save(active)
    await contactRepository.save(optedOut)

    const audience = CampaignAudience.create({ type: 'all' }).getValue()
    const campaign = makeCampaign(audience)

    const result = await resolve(campaign, WORKSPACE_ID, contactRepository, groupRepository)

    expect(result).toHaveLength(1)
    expect(result[0]?.contactId).toBe(active.contactId.toString())
  })

  it('filtra contactos sin canal válido para el canal de la campaña', async () => {
    const withEmail = makeContact({ channelType: ChannelType.Email })
    const withSms = makeContact({ channelType: ChannelType.SMS, channelValue: '+541122223333' })
    await contactRepository.save(withEmail)
    await contactRepository.save(withSms)

    const audience = CampaignAudience.create({ type: 'all' }).getValue()
    const campaign = makeCampaign(audience, ChannelType.Email)

    const result = await resolve(campaign, WORKSPACE_ID, contactRepository, groupRepository)

    expect(result).toHaveLength(1)
    expect(result[0]?.address).toBe('ana@example.com')
  })

  it('resuelve audiencia "manual" por contactIds', async () => {
    const contact = makeContact({})
    await contactRepository.save(contact)

    const audience = CampaignAudience.create({ type: 'manual', contactIds: [contact.contactId.toString()] }).getValue()
    const campaign = makeCampaign(audience)

    const result = await resolve(campaign, WORKSPACE_ID, contactRepository, groupRepository)

    expect(result).toHaveLength(1)
  })

  it('resuelve audiencia "group" vía findByGroup', async () => {
    const contact = makeContact({})
    await contactRepository.save(contact)

    const audience = CampaignAudience.create({ type: 'group', groupIds: ['group-1'] }).getValue()
    const campaign = makeCampaign(audience)

    const result = await resolve(campaign, WORKSPACE_ID, contactRepository, groupRepository)

    expect(result).toHaveLength(1)
  })

  it('retorna vacío para audiencia "segment" (no implementado)', async () => {
    const audience = CampaignAudience.create({ type: 'segment' }).getValue()
    const campaign = makeCampaign(audience)

    const result = await resolve(campaign, WORKSPACE_ID, contactRepository, groupRepository)

    expect(result).toEqual([])
  })
})
