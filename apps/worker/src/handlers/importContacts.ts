import * as fs from 'fs'
import { parse } from 'csv-parse'

import { ContactsImported } from '@bcp/domain'
import { IContactRepository, IEventBus, ICache } from '@bcp/contracts'
import { processImportBatch, importProgressKey, ImportProgress } from '@bcp/application'

const BATCH_SIZE = 100

export interface ImportContactsJobData {
  jobId: string
  workspaceId: string
  // ponytail: fileKey es una ruta local. Cuando exista storage real (S3), acá se descarga
  // primero el archivo a un path temporal antes de abrir el stream.
  fileKey: string
  columnMapping: Record<string, string>
}

export interface ImportContactsDeps {
  contactRepository: IContactRepository
  eventBus: IEventBus
  cache: ICache
}

export async function importContactsHandler(
  data: ImportContactsJobData,
  deps: ImportContactsDeps,
): Promise<void> {
  const { workspaceId, columnMapping, fileKey, jobId } = data
  const { contactRepository, eventBus, cache } = deps

  let processed = 0
  let successCount = 0
  const allErrors: string[] = []
  let rowNumber = 0
  let batch: { rowNumber: number; row: Record<string, string> }[] = []

  const flush = async (): Promise<void> => {
    if (batch.length === 0) return
    const result = await processImportBatch(workspaceId, columnMapping, batch, contactRepository)
    await contactRepository.saveBatch(result.toSave)
    successCount += result.successCount
    allErrors.push(...result.errors)
    processed += batch.length
    batch = []

    // ponytail: streaming, no sabemos el total de filas hasta terminar de leer el archivo,
    // así que `total` es igual a `processed` mientras el import está en curso.
    const progress: ImportProgress = {
      workspaceId,
      processed,
      total: processed,
      errors: allErrors,
      done: false,
    }
    await cache.set(importProgressKey(jobId), progress)
  }

  const parser = fs.createReadStream(fileKey).pipe(parse({ columns: true, trim: true }))

  for await (const row of parser as AsyncIterable<Record<string, string>>) {
    rowNumber++
    batch.push({ rowNumber, row })
    if (batch.length >= BATCH_SIZE) {
      await flush()
    }
  }
  await flush()

  const finalProgress: ImportProgress = {
    workspaceId,
    processed,
    total: processed,
    errors: allErrors,
    done: true,
  }
  await cache.set(importProgressKey(jobId), finalProgress)

  await eventBus.publish([
    new ContactsImported(jobId, workspaceId, processed, successCount, allErrors.length, allErrors),
  ])
}
