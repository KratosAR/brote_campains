import { Delivery } from '../delivery/Delivery'
import { DeliveryStatus } from '../delivery/DeliveryStatus'
import { ChannelType } from '../contact/ChannelType'
import { BusinessRuleViolationError, ValidationError } from '../shared/errors/DomainError'
import { DeliveryQueued, DeliveryFailed, DeliveryCompleted, DeliveryExpired } from '../delivery/events/DeliveryEvents'

function pending() {
  return Delivery.create(
    'campaign-1',
    'workspace-1',
    'contact-1',
    ChannelType.WhatsApp,
    '+5493511234567',
    'Hola!',
  ).getValue()
}

function queued() {
  const delivery = pending()
  delivery.markQueued()
  return delivery
}

function sending() {
  const delivery = queued()
  delivery.markSending(1)
  return delivery
}

function sent() {
  const delivery = sending()
  delivery.markSent('provider-msg-1')
  return delivery
}

function delivered() {
  const delivery = sent()
  delivery.markDelivered()
  return delivery
}

describe('Delivery.create', () => {
  it('creates a Pending delivery with empty attempts/timeline seed', () => {
    const delivery = pending()

    expect(delivery.status).toBe(DeliveryStatus.Pending)
    expect(delivery.attempts).toHaveLength(0)
    expect(delivery.timeline).toHaveLength(1)
  })

  it('fails when address is empty', () => {
    const result = Delivery.create('c1', 'w1', 'contact-1', ChannelType.Email, '  ', 'body')
    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(ValidationError)
  })

  it('fails when messageSnapshot is empty', () => {
    const result = Delivery.create('c1', 'w1', 'contact-1', ChannelType.Email, 'a@b.com', '')
    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(ValidationError)
  })
})

describe('Delivery transitions — valid path', () => {
  it('Pending -> Queued', () => {
    const delivery = pending()
    const result = delivery.markQueued()

    expect(result.isOk()).toBe(true)
    expect(delivery.status).toBe(DeliveryStatus.Queued)
    expect(delivery.domainEvents.some((e) => e instanceof DeliveryQueued)).toBe(true)
  })

  it('Queued -> Sending adds an attempt', () => {
    const delivery = queued()
    const result = delivery.markSending(1)

    expect(result.isOk()).toBe(true)
    expect(delivery.status).toBe(DeliveryStatus.Sending)
    expect(delivery.attempts).toHaveLength(1)
    expect(delivery.attempts[0]!.attemptNumber).toBe(1)
    expect(delivery.attempts[0]!.success).toBe(false)
  })

  it('Sending -> Sent resolves the last attempt and emits DeliveryCompleted', () => {
    const delivery = sending()
    const result = delivery.markSent('provider-msg-1')

    expect(result.isOk()).toBe(true)
    expect(delivery.status).toBe(DeliveryStatus.Sent)
    expect(delivery.providerMessageId).toBe('provider-msg-1')
    expect(delivery.attempts[0]!.success).toBe(true)
    expect(delivery.attempts[0]!.providerMessageId).toBe('provider-msg-1')
    const event = delivery.domainEvents.find((e) => e instanceof DeliveryCompleted) as DeliveryCompleted
    expect(event.status).toBe(DeliveryStatus.Sent)
  })

  it('Sent -> Delivered', () => {
    const delivery = sent()
    const result = delivery.markDelivered()

    expect(result.isOk()).toBe(true)
    expect(delivery.status).toBe(DeliveryStatus.Delivered)
  })

  it('Delivered -> Read', () => {
    const delivery = delivered()
    const result = delivery.markRead()

    expect(result.isOk()).toBe(true)
    expect(delivery.status).toBe(DeliveryStatus.Read)
  })

  it('Sending -> Failed resolves the last attempt as failure and emits DeliveryFailed', () => {
    const delivery = sending()
    const result = delivery.markFailed({ errorCode: '429', errorMessage: 'rate limited' })

    expect(result.isOk()).toBe(true)
    expect(delivery.status).toBe(DeliveryStatus.Failed)
    expect(delivery.attempts[0]!.success).toBe(false)
    expect(delivery.attempts[0]!.errorCode).toBe('429')
    const event = delivery.domainEvents.find((e) => e instanceof DeliveryFailed) as DeliveryFailed
    expect(event.attemptNumber).toBe(1)
    expect(event.errorCode).toBe('429')
  })

  it('any non-terminal status -> Expired', () => {
    const delivery = queued()
    const result = delivery.markExpired()

    expect(result.isOk()).toBe(true)
    expect(delivery.status).toBe(DeliveryStatus.Expired)
    expect(delivery.domainEvents.some((e) => e instanceof DeliveryExpired)).toBe(true)
  })

  it('Pending -> Cancelled', () => {
    const delivery = pending()
    const result = delivery.cancel()

    expect(result.isOk()).toBe(true)
    expect(delivery.status).toBe(DeliveryStatus.Cancelled)
  })

  it('Queued -> Cancelled', () => {
    const delivery = queued()
    const result = delivery.cancel()

    expect(result.isOk()).toBe(true)
    expect(delivery.status).toBe(DeliveryStatus.Cancelled)
  })
})

describe('Delivery transitions — invalid path', () => {
  it('cannot markQueued twice', () => {
    const delivery = queued()
    const result = delivery.markQueued()

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(BusinessRuleViolationError)
  })

  it('cannot markSending from Pending', () => {
    const delivery = pending()
    const result = delivery.markSending(1)

    expect(result.isFail()).toBe(true)
  })

  it('cannot markSent from Queued', () => {
    const delivery = queued()
    const result = delivery.markSent('x')

    expect(result.isFail()).toBe(true)
  })

  it('cannot markDelivered from Sending', () => {
    const delivery = sending()
    const result = delivery.markDelivered()

    expect(result.isFail()).toBe(true)
  })

  it('cannot markRead from Sent', () => {
    const delivery = sent()
    const result = delivery.markRead()

    expect(result.isFail()).toBe(true)
  })

  it('cannot markFailed from Queued', () => {
    const delivery = queued()
    const result = delivery.markFailed({})

    expect(result.isFail()).toBe(true)
  })

  it('cannot markExpired from a terminal status (Sent)', () => {
    const delivery = sent()
    const result = delivery.markExpired()

    expect(result.isFail()).toBe(true)
  })

  it('cannot cancel from Sending', () => {
    const delivery = sending()
    const result = delivery.cancel()

    expect(result.isFail()).toBe(true)
  })
})

describe('Delivery.canRetry', () => {
  it('is false when status is not Failed', () => {
    const delivery = queued()
    expect(delivery.canRetry(3)).toBe(false)
  })

  it('is true when Failed and attempts below maxRetries', () => {
    const delivery = sending()
    delivery.markFailed({ errorCode: '429' })

    expect(delivery.canRetry(3)).toBe(true)
  })

  it('is false when Failed but attempts reached maxRetries', () => {
    const delivery = sending()
    delivery.markFailed({ errorCode: '429' })

    expect(delivery.canRetry(1)).toBe(false)
  })
})

describe('Delivery timeline and attempts immutability', () => {
  it('accumulates timeline entries across transitions without mutating previous snapshots', () => {
    const delivery = pending()
    const timelineAfterCreate = delivery.timeline

    delivery.markQueued()
    const timelineAfterQueued = delivery.timeline

    expect(timelineAfterCreate).toHaveLength(1)
    expect(timelineAfterQueued).toHaveLength(2)
  })

  it('accumulates attempts across retries without mutating previous snapshots', () => {
    const delivery = sending()
    const attemptsAfterFirstSend = delivery.attempts
    delivery.markFailed({ errorCode: '429' })

    delivery.markQueued() // ponytail: no-op guard test — should fail, status stays Failed
    expect(attemptsAfterFirstSend).toHaveLength(1)
    expect(attemptsAfterFirstSend[0]!.success).toBe(false)
    expect(delivery.attempts[0]!.success).toBe(false)
    expect(delivery.attempts[0]!.errorCode).toBe('429')
  })
})
