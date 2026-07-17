import {
  UserId,
  WorkspaceId,
  WorkspaceUser,
  UserJoined,
  Result,
  DomainError,
  ValidationError,
  UnauthorizedError,
} from '@bcp/domain'
import {
  IUserRepository,
  IWorkspaceUserRepository,
  IInvitationRepository,
  IRefreshTokenRepository,
  IEventBus,
} from '@bcp/contracts'

import { hashPassword } from './security/passwordHasher'
import { validatePasswordComplexity } from './security/passwordValidator'
import { hashRefreshToken } from './security/refreshToken'
import { issueTokenPair, TokenPair } from './security/issueTokenPair'

export interface AcceptInvitationInput {
  token: string
  name: string
  password: string
}

const INVALID_INVITATION_MESSAGE = 'Invalid or expired invitation'

export class AcceptInvitationCommand {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly workspaceUserRepository: IWorkspaceUserRepository,
    private readonly invitationRepository: IInvitationRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly eventBus: IEventBus,
    private readonly jwtSecret: string,
  ) {}

  async execute(input: AcceptInvitationInput): Promise<Result<TokenPair, DomainError>> {
    if (!input.name || input.name.trim().length === 0) {
      return Result.fail(new ValidationError('Name cannot be empty', 'name'))
    }

    const passwordValidation = validatePasswordComplexity(input.password)
    if (!passwordValidation.isValid) {
      return Result.fail(new ValidationError(passwordValidation.errors.join('; '), 'password'))
    }

    const tokenHash = hashRefreshToken(input.token)
    const invitationResult = await this.invitationRepository.findByTokenHash(tokenHash)
    if (invitationResult.isFail()) {
      return Result.fail(new UnauthorizedError(INVALID_INVITATION_MESSAGE))
    }
    const invitation = invitationResult.getValue()

    if (invitation.acceptedAt !== null || invitation.expiresAt.getTime() <= Date.now()) {
      return Result.fail(new UnauthorizedError(INVALID_INVITATION_MESSAGE))
    }

    const userId = UserId.from(invitation.id)
    const passwordHash = await hashPassword(input.password)
    const now = new Date()

    const saveUserResult = await this.userRepository.save({
      id: userId.toString(),
      email: invitation.email,
      passwordHash,
      name: input.name.trim(),
      createdAt: now,
      updatedAt: now,
    })
    if (saveUserResult.isFail()) return Result.fail(saveUserResult.getError())

    const workspaceUser = WorkspaceUser.create({
      userId,
      workspaceId: WorkspaceId.from(invitation.workspaceId),
      role: invitation.role,
      invitedAt: invitation.createdAt,
      joinedAt: now,
    })
    const saveMembershipResult = await this.workspaceUserRepository.save(workspaceUser)
    if (saveMembershipResult.isFail()) return Result.fail(saveMembershipResult.getError())

    const markAcceptedResult = await this.invitationRepository.save({
      ...invitation,
      acceptedAt: now,
    })
    if (markAcceptedResult.isFail()) return Result.fail(markAcceptedResult.getError())

    await this.eventBus.publish([new UserJoined(invitation.workspaceId, invitation.workspaceId, userId.toString())])

    const tokensResult = await issueTokenPair({
      userId: userId.toString(),
      workspaceId: invitation.workspaceId,
      role: invitation.role,
      jwtSecret: this.jwtSecret,
      refreshTokenRepository: this.refreshTokenRepository,
    })
    if (tokensResult.isFail()) return Result.fail(tokensResult.getError())

    return Result.ok(tokensResult.getValue())
  }
}
