import { ChannelType, Contact, ContactChannel, ContactIdentity, Result, ValidationError } from '@bcp/domain'

// ponytail: mapeo de columnas fijo a estos nombres de campo (no config por-workspace de
// nombres custom más allá de columnMapping). Los valores del mapping son los headers reales
// del CSV; las keys son estos nombres conocidos.
const CHANNEL_FIELDS: Record<string, ChannelType> = {
  email: ChannelType.Email,
  whatsapp: ChannelType.WhatsApp,
  sms: ChannelType.SMS,
  telegram: ChannelType.Telegram,
}

export interface ImportRowResult {
  identity: ContactIdentity
  channels: ContactChannel[]
}

/**
 * Toma una fila ya parseada (header CSV -> valor) y el columnMapping (campo lógico -> header CSV),
 * valida y arma identity + channels. Función pura, sin I/O — así se puede testear sin filesystem.
 */
export function mapContactRow(
  columnMapping: Record<string, string>,
  row: Record<string, string>,
): Result<ImportRowResult, ValidationError> {
  const valueFor = (field: string): string | undefined => {
    const header = columnMapping[field]
    if (!header) return undefined
    const value = row[header]
    return value && value.trim().length > 0 ? value.trim() : undefined
  }

  const identityResult = ContactIdentity.create({
    firstName: valueFor('firstName') ?? '',
    lastName: valueFor('lastName'),
    company: valueFor('company'),
    externalId: valueFor('externalId'),
    notes: valueFor('notes'),
  })
  if (identityResult.isFail()) return Result.fail(identityResult.getError())

  const channels: ContactChannel[] = []
  for (const [field, channelType] of Object.entries(CHANNEL_FIELDS)) {
    const value = valueFor(field)
    if (!value) continue
    const channelResult = ContactChannel.create(channelType, value)
    if (channelResult.isFail()) return Result.fail(channelResult.getError())
    channels.push(channelResult.getValue())
  }

  if (channels.length === 0) {
    return Result.fail(new ValidationError('Row has no valid channel', 'channels'))
  }

  return Result.ok({ identity: identityResult.getValue(), channels })
}

export interface ImportRowOutcome {
  contact?: Contact
  error?: string
}

/**
 * Arma un Contact a partir de la fila. Devuelve el Contact o un mensaje de error legible
 * (el caller le agrega el número de fila).
 */
export function buildContactFromRow(workspaceId: string, mapped: ImportRowResult): ImportRowOutcome {
  const contactResult = Contact.create(workspaceId, mapped.identity, mapped.channels)
  if (contactResult.isFail()) {
    return { error: contactResult.getError().message }
  }
  return { contact: contactResult.getValue() }
}
