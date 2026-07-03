import {
  Email,
  UserRole,
  UserId,
  UserInvited,
  Result,
  DomainError,
  ValidationError,
  UnauthorizedError,
} from '@bcp/domain'
import {
  IUserRepository,
  IWorkspaceUserRepository,
  IInvitationRepository,
  IEventBus,
} from '@bcp/contracts'

import { generateRefreshToken, hashRefreshToken } from './security/refreshToken'

export interface InviteUserInput {
  workspaceId: string
  email: string
  role: UserRole
  invitedByUserId: string
}

export interface InviteUserOutput {
  invitationToken: string
}

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const ROLES_ALLOWED_TO_INVITE: UserRole[] = [UserRole.Owner, UserRole.Admin]

export class InviteUserCommand {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly workspaceUserRepository: IWorkspaceUserRepository,
    private readonly invitationRepository: IInvitationRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: InviteUserInput): Promise<Result<InviteUserOutput, DomainError>> {
    // Ownership is granted at registration or via workspace:transfer — never by invitation.
    // Otherwise an Admin could mint a new Owner and escalate past their own role.
    if (input.role === UserRole.Owner) {
      return Result.fail(new ValidationError('Cannot invite a user as Owner', 'role'))
    }

    const emailResult = Email.create(input.email)
    if (emailResult.isFail()) return Result.fail(emailResult.getError())
    const email = emailResult.getValue()

    const inviterResult = await this.workspaceUserRepository.findByUserAndWorkspace(
      input.invitedByUserId,
      input.workspaceId,
    )
    if (
      inviterResult.isFail() ||
      !ROLES_ALLOWED_TO_INVITE.includes(inviterResult.getValue().role)
    ) {
      return Result.fail(new UnauthorizedError('Not allowed to invite users to this workspace'))
    }

    const existingUser = await this.userRepository.findByEmail(email.toString())
    if (existingUser.isOk()) {
      return Result.fail(new ValidationError('Email is already a registered user', 'email'))
    }

    // The invitee's UserId is reserved now and reused when the invitation is
    // accepted, so InviteUserCommand can emit UserInvited with a real userId.
    const inviteeUserId = UserId.generate()
    const invitationToken = generateRefreshToken()
    const now = new Date()

    const saveResult = await this.invitationRepository.save({
      id: inviteeUserId.toString(),
      workspaceId: input.workspaceId,
      email: email.toString(),
      role: input.role,
      tokenHash: hashRefreshToken(invitationToken),
      invitedByUserId: input.invitedByUserId,
      expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
      acceptedAt: null,
      createdAt: now,
    })
    if (saveResult.isFail()) return Result.fail(saveResult.getError())

    await this.eventBus.publish([
      new UserInvited(
        input.workspaceId,
        input.workspaceId,
        inviteeUserId.toString(),
        email.toString(),
        input.role,
      ),
    ])

    return Result.ok({ invitationToken })
  }
}
