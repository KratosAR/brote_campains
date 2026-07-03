import {
  Email,
  Workspace,
  WorkspaceSettings,
  WorkspaceUser,
  UserId,
  UserRole,
  Result,
  DomainError,
  ValidationError,
} from '@bcp/domain'
import {
  IUserRepository,
  IWorkspaceRepository,
  IWorkspaceUserRepository,
  IRefreshTokenRepository,
  IEventBus,
} from '@bcp/contracts'

import { hashPassword } from './security/passwordHasher'
import { issueTokenPair, TokenPair } from './security/issueTokenPair'

export interface RegisterWorkspaceInput {
  ownerName: string
  ownerEmail: string
  ownerPassword: string
  workspaceName: string
  timezone: string
}

export interface RegisterWorkspaceOutput extends TokenPair {
  workspaceId: string
  userId: string
}

// ponytail: default locale/limits — no per-plan config yet, revisit when billing/plans land.
const DEFAULT_LOCALE = 'es-AR'
const DEFAULT_MAX_CONTACTS = 10_000
const DEFAULT_MAX_CAMPAIGNS = 100

export class RegisterWorkspaceCommand {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly workspaceRepository: IWorkspaceRepository,
    private readonly workspaceUserRepository: IWorkspaceUserRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly eventBus: IEventBus,
    private readonly jwtSecret: string,
  ) {}

  async execute(
    input: RegisterWorkspaceInput,
  ): Promise<Result<RegisterWorkspaceOutput, DomainError>> {
    const emailResult = Email.create(input.ownerEmail)
    if (emailResult.isFail()) return Result.fail(emailResult.getError())
    const email = emailResult.getValue()

    const existing = await this.userRepository.findByEmail(email.toString())
    if (existing.isOk()) {
      return Result.fail(new ValidationError('Email is already registered', 'ownerEmail'))
    }

    if (!input.ownerName || input.ownerName.trim().length === 0) {
      return Result.fail(new ValidationError('Owner name cannot be empty', 'ownerName'))
    }
    if (!input.ownerPassword || input.ownerPassword.length < 8) {
      return Result.fail(
        new ValidationError('Password must be at least 8 characters', 'ownerPassword'),
      )
    }

    const settingsResult = WorkspaceSettings.create({
      timezone: input.timezone,
      locale: DEFAULT_LOCALE,
      maxContacts: DEFAULT_MAX_CONTACTS,
      maxCampaigns: DEFAULT_MAX_CAMPAIGNS,
    })
    if (settingsResult.isFail()) return Result.fail(settingsResult.getError())

    const userId = UserId.generate()

    const workspaceResult = Workspace.create(
      input.workspaceName,
      settingsResult.getValue(),
      userId.toString(),
    )
    if (workspaceResult.isFail()) return Result.fail(workspaceResult.getError())
    const workspace = workspaceResult.getValue()

    const passwordHash = await hashPassword(input.ownerPassword)
    const now = new Date()

    const saveWorkspaceResult = await this.workspaceRepository.save(workspace)
    if (saveWorkspaceResult.isFail()) return Result.fail(saveWorkspaceResult.getError())

    const saveUserResult = await this.userRepository.save({
      id: userId.toString(),
      email: email.toString(),
      passwordHash,
      name: input.ownerName.trim(),
      createdAt: now,
      updatedAt: now,
    })
    if (saveUserResult.isFail()) return Result.fail(saveUserResult.getError())

    const workspaceUser = WorkspaceUser.create({
      userId,
      workspaceId: workspace.workspaceId,
      role: UserRole.Owner,
      invitedAt: now,
      joinedAt: now,
    })
    const saveMembershipResult = await this.workspaceUserRepository.save(workspaceUser)
    if (saveMembershipResult.isFail()) return Result.fail(saveMembershipResult.getError())

    await this.eventBus.publish(workspace.clearDomainEvents())

    const tokens = await issueTokenPair({
      userId: userId.toString(),
      workspaceId: workspace.workspaceId.toString(),
      role: UserRole.Owner,
      jwtSecret: this.jwtSecret,
      refreshTokenRepository: this.refreshTokenRepository,
    })

    return Result.ok({
      workspaceId: workspace.workspaceId.toString(),
      userId: userId.toString(),
      ...tokens,
    })
  }
}
