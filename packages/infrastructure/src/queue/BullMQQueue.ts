import { Queue } from 'bullmq'

import { IQueue, JobOptions } from '@bcp/contracts'

// ponytail: una sola cola BullMQ ('default'), los "queues" campaign/delivery/retry/webhook/analytics
// del spec son jobNames dentro de ella — separar en colas reales de BullMQ si el volumen lo justifica.
// Bull Board (UI de administración) no está configurado: fuera de alcance del motor de ejecución,
// agregar cuando se necesite observabilidad operativa manual.
export class BullMQQueue implements IQueue {
  constructor(private readonly queue: Queue) {}

  async add(jobName: string, data: unknown, options?: JobOptions): Promise<void> {
    await this.queue.add(jobName, data, options)
  }
}
