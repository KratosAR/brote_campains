import { Workspace } from '../workspace/Workspace'
import { WorkspaceSettings } from '../workspace/WorkspaceSettings'
import { WorkspaceStatus } from '../workspace/WorkspaceStatus'
import { BusinessRuleViolationError } from '../shared/errors/DomainError'

function makeSettings() {
  return WorkspaceSettings.create({
    timezone: 'America/Argentina/Buenos_Aires',
    locale: 'es-AR',
    maxContacts: 1000,
    maxCampaigns: 10,
  }).getValue()
}

describe('Workspace', () => {
  it('creates a workspace in Creating status and emits WorkspaceCreated', () => {
    const result = Workspace.create('Acme Inc', makeSettings(), 'owner-1')

    expect(result.isOk()).toBe(true)
    const workspace = result.getValue()
    expect(workspace.status).toBe(WorkspaceStatus.Creating)
    expect(workspace.slug).toBe('acme-inc')
    expect(workspace.domainEvents).toHaveLength(1)
    expect(workspace.domainEvents.some((e) => e.eventType === 'WorkspaceCreated')).toBe(true)
  })

  it('rejects an empty name', () => {
    const result = Workspace.create('', makeSettings(), 'owner-1')
    expect(result.isFail()).toBe(true)
  })

  it('activates from Creating', () => {
    const workspace = Workspace.create('Acme Inc', makeSettings(), 'owner-1').getValue()
    const result = workspace.activate()

    expect(result.isOk()).toBe(true)
    expect(workspace.status).toBe(WorkspaceStatus.Active)
  })

  it('rejects activation from any status other than Creating', () => {
    const workspace = Workspace.create('Acme Inc', makeSettings(), 'owner-1').getValue()
    workspace.activate()

    const result = workspace.activate()
    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(BusinessRuleViolationError)
  })

  it('suspends from Active and emits WorkspaceSuspended', () => {
    const workspace = Workspace.create('Acme Inc', makeSettings(), 'owner-1').getValue()
    workspace.activate()

    const result = workspace.suspend('billing overdue')

    expect(result.isOk()).toBe(true)
    expect(workspace.status).toBe(WorkspaceStatus.Suspended)
    expect(workspace.domainEvents.some((e) => e.eventType === 'WorkspaceSuspended')).toBe(true)
  })

  it('rejects suspend from Creating', () => {
    const workspace = Workspace.create('Acme Inc', makeSettings(), 'owner-1').getValue()
    const result = workspace.suspend('reason')

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(BusinessRuleViolationError)
  })

  it('rejects suspend from Archived', () => {
    const workspace = Workspace.create('Acme Inc', makeSettings(), 'owner-1').getValue()
    workspace.activate()
    workspace.suspend('reason')
    workspace.archive()

    const result = workspace.suspend('reason again')
    expect(result.isFail()).toBe(true)
  })

  it('archives from Suspended and emits WorkspaceArchived', () => {
    const workspace = Workspace.create('Acme Inc', makeSettings(), 'owner-1').getValue()
    workspace.activate()
    workspace.suspend('reason')

    const result = workspace.archive()

    expect(result.isOk()).toBe(true)
    expect(workspace.status).toBe(WorkspaceStatus.Archived)
    expect(workspace.domainEvents.some((e) => e.eventType === 'WorkspaceArchived')).toBe(true)
  })

  it('rejects archive from Active', () => {
    const workspace = Workspace.create('Acme Inc', makeSettings(), 'owner-1').getValue()
    workspace.activate()

    const result = workspace.archive()
    expect(result.isFail()).toBe(true)
  })

  it('rejects archive from Creating', () => {
    const workspace = Workspace.create('Acme Inc', makeSettings(), 'owner-1').getValue()

    const result = workspace.archive()
    expect(result.isFail()).toBe(true)
  })

  it('a workspace cannot go from Archived back to Active', () => {
    const workspace = Workspace.create('Acme Inc', makeSettings(), 'owner-1').getValue()
    workspace.activate()
    workspace.suspend('reason')
    workspace.archive()

    const result = workspace.activate()

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(BusinessRuleViolationError)
    expect(workspace.status).toBe(WorkspaceStatus.Archived)
  })
})
