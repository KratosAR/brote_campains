import { Result, DomainError, UnauthorizedError } from '@bcp/domain'
import { IUserRepository, IWorkspaceUserRepository, IRefreshTokenRepository } from '@bcp/contracts'

import { verifyPassword } from './security/passwordHasher'
import { issueTokenPair, TokenPair } from './security/issueTokenPair'

export interface LoginInput {
  email: string
  password: string
}

// Same message for "no such user" and "wrong password" — never reveal which one failed.
const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password'

// bcrypt(cost 12) of an arbitrary string — NOT a real credential. Used only to
// run a compare when the email is unknown, so response time does not reveal
// whether an account exists.
const TIMING_EQUALIZER_HASH = '$2b$12$aO1l3HkFh.LKqS8meHMo.eRRtFDNoxSEJEOG8lnQjZhdpsJIy10zS'

export class LoginCommand {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly workspaceUserRepository: IWorkspaceUserRepository,
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly jwtSecret: string,
  ) {}

  async execute(input: LoginInput): Promise<Result<TokenPair, DomainError>> {
    const userResult = await this.userRepository.findByEmail(input.email.trim().toLowerCase())
    if (userResult.isFail()) {
      // Burn the same bcrypt cost as the happy path before failing.
      await verifyPassword(input.password, TIMING_EQUALIZER_HASH)
      return Result.fail(new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE))
    }
    const user = userResult.getValue()

    const passwordMatches = await verifyPassword(input.password, user.passwordHash)
    if (!passwordMatches) {
      return Result.fail(new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE))
    }

    const membershipResult = await this.workspaceUserRepository.findByUserId(user.id)
    if (membershipResult.isFail()) {
      return Result.fail(new UnauthorizedError(INVALID_CREDENTIALS_MESSAGE))
    }
    const membership = membershipResult.getValue()

    const tokens = await issueTokenPair({
      userId: user.id,
      workspaceId: membership.workspaceId.toString(),
      role: membership.role,
      jwtSecret: this.jwtSecret,
      refreshTokenRepository: this.refreshTokenRepository,
    })

    return Result.ok(tokens)
  }
}
