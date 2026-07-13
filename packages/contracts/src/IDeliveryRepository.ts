import { Result, Delivery, DeliveryId, DeliveryStatus, NotFoundError } from '@bcp/domain'
import { Pagination, Page } from './IContactRepository'

export interface IDeliveryRepository {
  findById(id: DeliveryId, workspaceId: string): Promise<Result<Delivery, NotFoundError>>
  findByProviderMessageId(providerMessageId: string): Promise<Delivery | null>
  findByCampaign(
    campaignId: string,
    workspaceId: string,
    status: DeliveryStatus | undefined,
    pagination: Pagination,
  ): Promise<Page<Delivery>>
  countByCampaignAndStatus(campaignId: string, workspaceId: string): Promise<Record<string, number>>
  save(delivery: Delivery): Promise<Result<void, NotFoundError>>
  saveBatch(deliveries: Delivery[]): Promise<void>
}
