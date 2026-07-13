import {
  Result,
  NotFoundError,
  Campaign,
  CampaignId,
  CampaignStatus,
  Delivery,
  DeliveryId,
  DeliveryStatus,
} from '@bcp/domain'
import { ICampaignRepository, IDeliveryRepository, IQueue, JobOptions, Pagination, Page, MessagingProvider, OutboundMessage, ProviderResponse } from '@bcp/contracts'

// ponytail: mismo patrón que packages/application/src/*/__tests__/testDoubles.ts, copiado acá
// porque esos fakes viven en carpetas __tests__ internas de otro paquete y no se exportan.
export class InMemoryCampaignRepository implements ICampaignRepository {
  readonly campaigns = new Map<string, Campaign>()

  async findById(id: CampaignId, workspaceId: string): Promise<Result<Campaign, NotFoundError>> {
    const found = this.campaigns.get(id.toString())
    if (!found || found.workspaceId !== workspaceId) {
      return Result.fail(new NotFoundError('Campaign', id.toString()))
    }
    return Result.ok(found)
  }

  async findByStatus(workspaceId: string, statuses: CampaignStatus[], pagination: Pagination): Promise<Page<Campaign>> {
    const items = [...this.campaigns.values()].filter(
      (c) => c.workspaceId === workspaceId && statuses.includes(c.status),
    )
    return { items, total: items.length, page: pagination.page, limit: pagination.limit }
  }

  async findScheduledBefore(): Promise<Campaign[]> {
    return []
  }

  async findRunning(workspaceId: string): Promise<Campaign[]> {
    return [...this.campaigns.values()].filter((c) => c.workspaceId === workspaceId && c.status === CampaignStatus.Running)
  }

  async save(campaign: Campaign): Promise<Result<void, NotFoundError>> {
    this.campaigns.set(campaign.campaignId.toString(), campaign)
    return Result.ok(undefined)
  }
}

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

  async countByCampaignAndStatus(): Promise<Record<string, number>> {
    return {}
  }

  async save(delivery: Delivery): Promise<Result<void, NotFoundError>> {
    this.deliveries.set(delivery.deliveryId.toString(), delivery)
    return Result.ok(undefined)
  }

  async saveBatch(deliveries: Delivery[]): Promise<void> {
    for (const delivery of deliveries) this.deliveries.set(delivery.deliveryId.toString(), delivery)
  }
}

export interface QueuedJob {
  jobName: string
  data: unknown
  options?: JobOptions
}

export class FakeQueue implements IQueue {
  readonly jobs: QueuedJob[] = []

  async add(jobName: string, data: unknown, options?: JobOptions): Promise<void> {
    this.jobs.push({ jobName, data, options })
  }
}

// ponytail: provider de test controlable por closure, no necesita mocking library para 4 casos.
export class ScriptedProvider implements MessagingProvider {
  readonly providerId = 'scripted'
  constructor(private readonly script: Array<() => Promise<ProviderResponse>>) {}
  private calls = 0

  capabilities() {
    return { supportsTemplates: false, supportsMedia: false, supportsButtons: false, maxMessagesPerMinute: 1000 }
  }

  async send(_message: OutboundMessage): Promise<ProviderResponse> {
    const step = this.script[this.calls] ?? this.script[this.script.length - 1]
    this.calls += 1
    if (!step) throw new Error('ScriptedProvider: no script step configured')
    return step()
  }

  async health() {
    return { status: 'online' as const, latencyMs: 1 }
  }
}
