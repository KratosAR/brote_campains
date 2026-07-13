import { Delivery, ChannelType } from '@bcp/domain'

import { DeliveryMapper } from '../persistence/DeliveryMapper'

function makeDelivery(): Delivery {
  return Delivery.create(
    'campaign-1',
    'workspace-1',
    'contact-1',
    ChannelType.Email,
    'a@b.com',
    'Hello world',
  ).getValue()
}

describe('DeliveryMapper', () => {
  it('round-trips a pending delivery through toPersistence/toDomain', () => {
    const delivery = makeDelivery()

    const record = DeliveryMapper.toPersistence(delivery)
    const hydrated = DeliveryMapper.toDomain(record as never)

    expect(hydrated.campaignId).toBe('campaign-1')
    expect(hydrated.workspaceId).toBe('workspace-1')
    expect(hydrated.contactId).toBe('contact-1')
    expect(hydrated.channel).toBe(ChannelType.Email)
    expect(hydrated.address).toBe('a@b.com')
    expect(hydrated.status).toBe(delivery.status)
    expect(hydrated.timeline).toHaveLength(1)
    expect(hydrated.attempts).toHaveLength(0)
  })

  it('round-trips attempts and providerMessageId after a sent delivery', () => {
    const delivery = makeDelivery()
    delivery.markQueued()
    delivery.markSending(1)
    delivery.markSent('provider-msg-1')

    const record = DeliveryMapper.toPersistence(delivery)
    const hydrated = DeliveryMapper.toDomain(record as never)

    expect(hydrated.providerMessageId).toBe('provider-msg-1')
    expect(hydrated.attempts).toHaveLength(1)
    expect(hydrated.attempts[0]?.success).toBe(true)
    expect(hydrated.attempts[0]?.providerMessageId).toBe('provider-msg-1')
  })
})
