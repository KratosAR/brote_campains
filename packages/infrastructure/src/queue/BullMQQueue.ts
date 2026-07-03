import { Queue } from 'bullmq'

import { IQueue, JobOptions } from '@bcp/contracts'

export class BullMQQueue implements IQueue {
  constructor(private readonly queue: Queue) {}

  async add(jobName: string, data: unknown, options?: JobOptions): Promise<void> {
    await this.queue.add(jobName, data, options)
  }
}
