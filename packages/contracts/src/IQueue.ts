export interface JobOptions {
  delay?: number
  attempts?: number
  backoff?: { type: 'exponential' | 'fixed'; delay: number }
  priority?: number
}

export interface IQueue {
  add(jobName: string, data: unknown, options?: JobOptions): Promise<void>
}
