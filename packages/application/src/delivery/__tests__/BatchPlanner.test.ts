import { plan } from '../BatchPlanner'

describe('BatchPlanner', () => {
  it('divide deliveryIds en lotes de tamaño ratePerMinute', () => {
    const ids = Array.from({ length: 25 }, (_, i) => `d-${i}`)

    const batches = plan(ids, 10)

    expect(batches).toHaveLength(3)
    expect(batches[0]?.deliveryIds).toHaveLength(10)
    expect(batches[1]?.deliveryIds).toHaveLength(10)
    expect(batches[2]?.deliveryIds).toHaveLength(5)
  })

  it('incrementa scheduledAfter un minuto por lote', () => {
    const ids = Array.from({ length: 20 }, (_, i) => `d-${i}`)

    const batches = plan(ids, 10)

    const diffMs = batches[1]!.scheduledAfter.getTime() - batches[0]!.scheduledAfter.getTime()
    expect(diffMs).toBe(60_000)
    expect(batches[0]?.priority).toBe(1)
  })
})
