import { Router } from 'express'
import { AwilixContainer } from 'awilix'
import {
  GetDashboardQuery,
  GetCampaignStatsQuery,
  CompareCampaignsQuery,
  GetTopCampaignsQuery,
  GetDeliveryBreakdownQuery,
} from '@bcp/application'
import { Cradle } from '../container'

export function createAnalyticsRouter(container: AwilixContainer<Cradle>): Router {
  const router = Router()
  const campaignRepo = container.resolve('campaignRepository') as any
  const deliveryRepo = container.resolve('deliveryRepository') as any

  router.get('/workspaces/:workspaceId/analytics/dashboard', async (req, res) => {
    const workspaceId = String(req.params.workspaceId)
    const period = (req.query.period as string) ?? '7d'

    try {
      const query = new GetDashboardQuery(campaignRepo, deliveryRepo)
      const stats = await query.execute(workspaceId, period as '24h' | '7d' | '30d')
      res.json({ success: true, data: stats })
    } catch {
      res.status(500).json({ success: false, error: 'Internal server error' })
    }
  })

  router.get('/workspaces/:workspaceId/analytics/campaigns/:campaignId', async (req, res) => {
    const { workspaceId, campaignId } = req.params

    try {
      const query = new GetCampaignStatsQuery(campaignRepo, deliveryRepo)
      const stats = await query.execute(String(campaignId), String(workspaceId))
      res.json({ success: true, data: stats })
    } catch {
      res.status(500).json({ success: false, error: 'Internal server error' })
    }
  })

  router.get('/workspaces/:workspaceId/analytics/campaigns/compare', async (req, res) => {
    const workspaceId = String(req.params.workspaceId)
    const ids = (req.query.ids as string)?.split(',') ?? []

    try {
      const query = new CompareCampaignsQuery(campaignRepo, deliveryRepo)
      const results = await query.execute(workspaceId, ids)
      res.json({ success: true, data: results })
    } catch {
      res.status(500).json({ success: false, error: 'Internal server error' })
    }
  })

  router.get('/workspaces/:workspaceId/analytics/campaigns/top', async (req, res) => {
    const workspaceId = String(req.params.workspaceId)
    const metric = (req.query.metric as 'deliveryRate' | 'readRate') ?? 'deliveryRate'
    const limit = Math.min(parseInt((req.query.limit as string) ?? '10'), 100)

    try {
      const query = new GetTopCampaignsQuery(campaignRepo, deliveryRepo)
      const results = await query.execute(workspaceId, metric, limit)
      res.json({ success: true, data: results })
    } catch {
      res.status(500).json({ success: false, error: 'Internal server error' })
    }
  })

  router.get('/workspaces/:workspaceId/analytics/campaigns/:campaignId/deliveries', async (req, res) => {
    const { workspaceId, campaignId } = req.params
    const groupBy = (req.query.groupBy as 'status' | 'hour' | 'provider') ?? 'status'

    try {
      const query = new GetDeliveryBreakdownQuery(deliveryRepo)
      const breakdown = await query.execute(String(campaignId), String(workspaceId), groupBy)
      res.json({ success: true, data: breakdown })
    } catch {
      res.status(500).json({ success: false, error: 'Internal server error' })
    }
  })

  return router
}
