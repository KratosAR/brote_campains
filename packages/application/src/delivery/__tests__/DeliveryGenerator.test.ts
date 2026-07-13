import {
  Campaign,
  CampaignAudience,
  Contact,
  ContactIdentity,
  ContactChannel,
  ChannelType,
  Template,
  TemplateContent,
} from '@bcp/domain'
import { InMemoryDeliveryRepository } from './testDoubles'
import { NoopEventBus } from '../../contact/__tests__/testDoubles'
import { generate } from '../DeliveryGenerator'
import { ResolvedContact } from '../AudienceResolver'

const WORKSPACE_ID = 'ws-1'

function makeCampaign(): Campaign {
  const audience = CampaignAudience.create({ type: 'all' }).getValue()
  return Campaign.createDraft(WORKSPACE_ID, 'Welcome', ChannelType.Email, audience, 'template-1').getValue()
}

function makeContact(firstName?: string): Contact {
  const identity = ContactIdentity.create({ firstName: firstName ?? 'Ana' }).getValue()
  const channel = ContactChannel.create(ChannelType.Email, 'ana@example.com').getValue()
  return Contact.create(WORKSPACE_ID, identity, [channel]).getValue()
}

function makeTemplate(body: string): Template {
  const content = TemplateContent.create(body).getValue()
  return Template.create(WORKSPACE_ID, 'tpl', ChannelType.Email, content).getValue()
}

function makeResolved(contact: Contact): ResolvedContact {
  return { contactId: contact.contactId.toString(), address: 'ana@example.com', contact }
}

describe('DeliveryGenerator', () => {
  let deliveryRepository: InMemoryDeliveryRepository
  let eventBus: NoopEventBus

  beforeEach(() => {
    deliveryRepository = new InMemoryDeliveryRepository()
    eventBus = new NoopEventBus()
  })

  it('genera Deliveries con el mensaje renderizado', async () => {
    const campaign = makeCampaign()
    const contact = makeContact('Ana')
    const template = makeTemplate('Hola {{contact.firstName}}')

    const deliveries = await generate(campaign, [makeResolved(contact)], template, deliveryRepository, eventBus)

    expect(deliveries).toHaveLength(1)
    expect(deliveries[0]?.messageSnapshot).toBe('Hola Ana')
    expect(deliveryRepository.deliveries.size).toBe(1)
  })

  it('salta contactos con variable faltante sin fallar el batch', async () => {
    const campaign = makeCampaign()
    const withCompany = makeContact('Ana')
    const withoutCompany = makeContact('Luis')
    const template = makeTemplate('Hola {{contact.company}}')

    const deliveries = await generate(
      campaign,
      [makeResolved(withCompany), makeResolved(withoutCompany)],
      template,
      deliveryRepository,
      eventBus,
    )

    expect(deliveries).toHaveLength(0)
  })
})
