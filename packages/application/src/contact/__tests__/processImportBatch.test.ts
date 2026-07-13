import { Contact, NotFoundError, Result } from '@bcp/domain'
import { IContactRepository, ContactSearchFilters, Pagination, Page } from '@bcp/contracts'
import { processImportBatch } from '../processImportBatch'
import { mapContactRow } from '../importRow'

class FakeContactRepository implements IContactRepository {
  saved: Contact[] = []
  private byChannel = new Map<string, Contact>()

  seed(type: string, value: string, contact: Contact): void {
    this.byChannel.set(`${type}:${value}`, contact)
  }

  async findById(): Promise<Result<Contact, NotFoundError>> {
    return Result.fail(new NotFoundError('Contact', 'x'))
  }

  async findByChannel(type: string, value: string): Promise<Result<Contact, NotFoundError>> {
    const existing = this.byChannel.get(`${type}:${value}`)
    return existing ? Result.ok(existing) : Result.fail(new NotFoundError('Contact', value))
  }

  async findByExternalId(): Promise<Result<Contact, NotFoundError>> {
    return Result.fail(new NotFoundError('Contact', 'x'))
  }

  async search(
    _workspaceId: string,
    _filters: ContactSearchFilters,
    pagination: Pagination,
  ): Promise<Page<Contact>> {
    return { items: [], total: 0, page: pagination.page, limit: pagination.limit }
  }

  async findByGroup(
    _groupId: string,
    _workspaceId: string,
    pagination: Pagination,
  ): Promise<Page<Contact>> {
    return { items: [], total: 0, page: pagination.page, limit: pagination.limit }
  }

  async countByWorkspace(): Promise<number> {
    return 0
  }

  async save(): Promise<Result<void, NotFoundError>> {
    return Result.ok(undefined)
  }

  async saveBatch(contacts: Contact[]): Promise<void> {
    this.saved.push(...contacts)
  }
}

const columnMapping = { firstName: 'Nombre', email: 'Correo' }

describe('mapContactRow', () => {
  it('mapea una fila valida a identity + channels', () => {
    const result = mapContactRow(columnMapping, { Nombre: 'Ana', Correo: 'ana@test.com' })
    expect(result.isOk()).toBe(true)
    expect(result.getValue().identity.firstName).toBe('Ana')
    expect(result.getValue().channels).toHaveLength(1)
  })

  it('falla si no hay firstName', () => {
    const result = mapContactRow(columnMapping, { Nombre: '', Correo: 'ana@test.com' })
    expect(result.isFail()).toBe(true)
  })

  it('falla si no hay ningun channel valido', () => {
    const result = mapContactRow(columnMapping, { Nombre: 'Ana', Correo: '' })
    expect(result.isFail()).toBe(true)
  })
})

describe('processImportBatch', () => {
  it('crea contactos nuevos y acumula errores con numero de fila', async () => {
    const repo = new FakeContactRepository()

    const rows = [
      { rowNumber: 1, row: { Nombre: 'Ana', Correo: 'ana@test.com' } },
      { rowNumber: 2, row: { Nombre: '', Correo: 'bad@test.com' } },
    ]

    const result = await processImportBatch('ws-1', columnMapping, rows, repo)

    expect(result.successCount).toBe(1)
    expect(result.toSave).toHaveLength(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toMatch(/^Row 2:/)
  })

  it('actualiza un contacto existente en vez de crear uno nuevo (duplicado por channel)', async () => {
    const repo = new FakeContactRepository()
    const identityResult = mapContactRow(columnMapping, { Nombre: 'Viejo', Correo: 'ana@test.com' })
    const existing = Contact.create(
      'ws-1',
      identityResult.getValue().identity,
      identityResult.getValue().channels,
    ).getValue()
    repo.seed('Email', 'ana@test.com', existing)

    const rows = [{ rowNumber: 1, row: { Nombre: 'Nuevo', Correo: 'ana@test.com' } }]

    const result = await processImportBatch('ws-1', columnMapping, rows, repo)

    expect(result.successCount).toBe(1)
    expect(result.toSave).toHaveLength(1)
    expect(result.toSave[0]!.contactId.equals(existing.contactId)).toBe(true)
    expect(result.toSave[0]!.identity.firstName).toBe('Nuevo')
  })
})
