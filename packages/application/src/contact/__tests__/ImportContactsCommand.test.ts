import { IQueue, JobOptions } from '@bcp/contracts'
import { ImportContactsCommand, IMPORT_CONTACTS_JOB } from '../ImportContactsCommand'

class FakeQueue implements IQueue {
  calls: { jobName: string; data: unknown; options?: JobOptions }[] = []

  async add(jobName: string, data: unknown, options?: JobOptions): Promise<void> {
    this.calls.push({ jobName, data, options })
  }
}

describe('ImportContactsCommand', () => {
  it('encola el job import-contacts y retorna un jobId', async () => {
    const queue = new FakeQueue()
    const command = new ImportContactsCommand(queue)

    const result = await command.execute({
      workspaceId: 'ws-1',
      fileKey: '/tmp/contacts.csv',
      columnMapping: { firstName: 'Nombre', email: 'Email' },
    })

    expect(result.isOk()).toBe(true)
    expect(result.getValue().jobId).toBeTruthy()

    expect(queue.calls).toHaveLength(1)
    expect(queue.calls[0]!.jobName).toBe(IMPORT_CONTACTS_JOB)
    expect(queue.calls[0]!.data).toMatchObject({
      workspaceId: 'ws-1',
      fileKey: '/tmp/contacts.csv',
      columnMapping: { firstName: 'Nombre', email: 'Email' },
    })
  })

  it('falla si falta workspaceId', async () => {
    const queue = new FakeQueue()
    const command = new ImportContactsCommand(queue)

    const result = await command.execute({
      workspaceId: '',
      fileKey: '/tmp/contacts.csv',
      columnMapping: { firstName: 'Nombre' },
    })

    expect(result.isFail()).toBe(true)
    expect(queue.calls).toHaveLength(0)
  })

  it('falla si columnMapping esta vacio', async () => {
    const queue = new FakeQueue()
    const command = new ImportContactsCommand(queue)

    const result = await command.execute({
      workspaceId: 'ws-1',
      fileKey: '/tmp/contacts.csv',
      columnMapping: {},
    })

    expect(result.isFail()).toBe(true)
  })
})
