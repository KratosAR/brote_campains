import { Campaign, Delivery, Template, resolveTemplateVariables } from '@bcp/domain'
import { IDeliveryRepository, IEventBus } from '@bcp/contracts'
import { ResolvedContact } from './AudienceResolver'

const BATCH_SIZE = 100

export async function generate(
  campaign: Campaign,
  resolvedContacts: ResolvedContact[],
  template: Template,
  deliveryRepository: IDeliveryRepository,
  eventBus: IEventBus,
): Promise<Delivery[]> {
  const content = template.getActiveContent()
  const deliveries: Delivery[] = []

  for (const resolved of resolvedContacts) {
    const rendered = resolveTemplateVariables(content, {
      contact: {
        firstName: resolved.contact.identity.firstName,
        lastName: resolved.contact.identity.lastName,
        company: resolved.contact.identity.company,
      },
      campaignName: campaign.name,
      custom: {},
    })

    // ponytail: variable faltante -> se salta el contacto, no rompe el batch completo
    if (rendered.isFail()) continue

    const delivery = Delivery.create(
      campaign.campaignId.toString(),
      campaign.workspaceId,
      resolved.contactId,
      campaign.channel,
      resolved.address,
      rendered.getValue(),
    )
    if (delivery.isFail()) continue

    deliveries.push(delivery.getValue())
  }

  for (let i = 0; i < deliveries.length; i += BATCH_SIZE) {
    await deliveryRepository.saveBatch(deliveries.slice(i, i + BATCH_SIZE))
  }

  // ponytail: Delivery.create() no emite DeliveryQueued (recién se emite en markQueued(),
  // responsabilidad de otro paso). No hay eventos que publicar acá; eventBus queda sin uso
  // real por ahora, se mantiene en la firma por si otro paso futuro los necesita.
  void eventBus

  return deliveries
}
