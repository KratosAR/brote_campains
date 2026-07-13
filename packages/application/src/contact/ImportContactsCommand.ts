import { Result, UniqueId, ValidationError } from '@bcp/domain'
import { IQueue } from '@bcp/contracts'

export interface ImportContactsOptions {
  hasHeader?: boolean
}

export interface ImportContactsInput {
  workspaceId: string
  // ponytail: fileKey es una ruta local legible por el worker. No hay storage (S3) implementado
  // todavía — cuando exista, esto pasa a ser una key de bucket y el worker la descarga primero.
  fileKey: string
  columnMapping: Record<string, string>
  options?: ImportContactsOptions
}

export interface ImportContactsOutput {
  jobId: string
}

export const IMPORT_CONTACTS_JOB = 'import-contacts'

export class ImportContactsCommand {
  constructor(private readonly queue: IQueue) {}

  async execute(
    input: ImportContactsInput,
  ): Promise<Result<ImportContactsOutput, ValidationError>> {
    if (!input.workspaceId || input.workspaceId.trim().length === 0) {
      return Result.fail(new ValidationError('workspaceId cannot be empty', 'workspaceId'))
    }
    if (!input.fileKey || input.fileKey.trim().length === 0) {
      return Result.fail(new ValidationError('fileKey cannot be empty', 'fileKey'))
    }
    if (!input.columnMapping || Object.keys(input.columnMapping).length === 0) {
      return Result.fail(new ValidationError('columnMapping cannot be empty', 'columnMapping'))
    }

    const jobId = UniqueId.generate().toString()

    await this.queue.add(IMPORT_CONTACTS_JOB, {
      jobId,
      workspaceId: input.workspaceId,
      fileKey: input.fileKey,
      columnMapping: input.columnMapping,
      options: input.options ?? {},
    })

    return Result.ok({ jobId })
  }
}
