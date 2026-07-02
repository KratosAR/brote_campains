import { Router, IRouter } from 'express'

const router: IRouter = Router()

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

export { router as healthRouter }
