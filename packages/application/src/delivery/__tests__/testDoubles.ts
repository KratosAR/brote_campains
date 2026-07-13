import { Result, Delivery, DeliveryId, DeliveryStatus, NotFoundError } from '@bcp/domain'
import { IDeliveryRepository, Pagination, Page } from '@bcp/contracts'

export class InMemoryDeliveryRepository implements IDeliveryRepository {
  readonly deliveries = new Map<string, Delivery>()

  async findById(id: DeliveryId, workspaceId: string): Promise<Result<Delivery, NotFoundError>> {
    const found = this.deliveries.get(id.toString())
    if (!found || found.workspaceId !== workspaceId) {
      return Result.fail(new NotFoundError('Delivery', id.toString()))
    }
    return Result.ok(found)
  }

  async findByProviderMessageId(providerMessageId: string): Promise<Delivery | null> {
    return [...this.deliveries.values()].find((d) => d.providerMessageId === providerMessageId) ?? null
  }

  async findByCampaign(
    campaignId: string,
    workspaceId: string,
    status: DeliveryStatus | undefined,
    pagination: Pagination,
  ): Promise<Page<Delivery>> {
    const items = [...this.deliveries.values()].filter(
      (d) => d.campaignId === campaignId && d.workspaceId === workspaceId && (!status || d.status === status),
    )
    return { items, total: items.length, page: pagination.page, limit: pagination.limit }
  }

  async countByCampaignAndStatus(campaignId: string, workspaceId: string): Promise<Record<string, number>> {
    const items = [...this.deliveries.values()].filter(
      (d) => d.campaignId === campaignId && d.workspaceId === workspaceId,
    )
    return items.reduce<Record<string, number>>((acc, d) => {
      acc[d.status] = (acc[d.status] ?? 0) + 1
      return acc
    }, {})
  }

  async save(delivery: Delivery): Promise<Result<void, NotFoundError>> {
    this.deliveries.set(delivery.deliveryId.toString(), delivery)
    return Result.ok(undefined)
  }

  async saveBatch(deliveries: Delivery[]): Promise<void> {
    for (const delivery of deliveries) this.deliveries.set(delivery.deliveryId.toString(), delivery)
  }
}
