import { Result, NotFoundError } from '@bcp/domain'
import { ICache } from '@bcp/contracts'

export interface ImportProgress {
  workspaceId: string
  processed: number
  total: number
  errors: string[]
  done: boolean
}

export interface GetImportStatusInput {
  jobId: string
  workspaceId: string
}

// ponytail: progreso guardado en cache (Redis), sin persistencia durable. Si el proceso
// reinicia o el cache expira, se pierde el estado. Upgrade: tabla `ImportJob` en Postgres
// con el mismo shape si hace falta sobrevivir un restart.
export const importProgressKey = (jobId: string): string => `import:${jobId}`

export class GetImportStatusQuery {
  constructor(private readonly cache: ICache) {}

  async execute(input: GetImportStatusInput): Promise<Result<ImportProgress, NotFoundError>> {
    const progress = await this.cache.get<ImportProgress>(importProgressKey(input.jobId))
    if (!progress || progress.workspaceId !== input.workspaceId) {
      return Result.fail(new NotFoundError('ImportJob', input.jobId))
    }
    return Result.ok(progress)
  }
}
