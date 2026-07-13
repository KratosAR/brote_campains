import { Contact } from '@bcp/domain'
import { IContactRepository } from '@bcp/contracts'
import { mapContactRow, buildContactFromRow } from './importRow'

export interface ImportRowInput {
  rowNumber: number
  row: Record<string, string>
}

export interface ImportBatchResult {
  toSave: Contact[]
  errors: string[]
  successCount: number
}

/**
 * Procesa un lote de filas ya leídas del archivo: mapea, detecta duplicados por channel
 * existente (update en vez de create) y junta los Contact listos para persistir.
 * Pura salvo por la consulta de duplicados (findByChannel), que necesita el repository.
 */
export async function processImportBatch(
  workspaceId: string,
  columnMapping: Record<string, string>,
  rows: ImportRowInput[],
  contactRepository: IContactRepository,
): Promise<ImportBatchResult> {
  const toSave: Contact[] = []
  const errors: string[] = []
  let successCount = 0

  for (const { rowNumber, row } of rows) {
    const mappedResult = mapContactRow(columnMapping, row)
    if (mappedResult.isFail()) {
      errors.push(`Row ${rowNumber}: ${mappedResult.getError().message}`)
      continue
    }
    const mapped = mappedResult.getValue()

    const primaryChannel = mapped.channels[0]
    if (!primaryChannel) {
      errors.push(`Row ${rowNumber}: Row has no valid channel`)
      continue
    }
    const existing = await contactRepository.findByChannel(
      primaryChannel.type,
      primaryChannel.value,
      workspaceId,
    )

    if (existing.isOk()) {
      const contact = existing.getValue()
      const updateResult = contact.updateIdentity(mapped.identity)
      if (updateResult.isFail()) {
        errors.push(`Row ${rowNumber}: ${updateResult.getError().message}`)
        continue
      }
      for (const channel of mapped.channels) {
        contact.addChannel(channel) // ignora duplicate-channel error, ya está agregado
      }
      toSave.push(contact)
      successCount++
      continue
    }

    const outcome = buildContactFromRow(workspaceId, mapped)
    if (outcome.error || !outcome.contact) {
      errors.push(`Row ${rowNumber}: ${outcome.error}`)
      continue
    }
    toSave.push(outcome.contact)
    successCount++
  }

  return { toSave, errors, successCount }
}
