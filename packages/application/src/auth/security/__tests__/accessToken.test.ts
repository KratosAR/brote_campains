import jwt from 'jsonwebtoken'
import { UserRole, Permission } from '@bcp/domain'
import { signAccessToken, verifyAccessToken, ACCESS_TOKEN_TTL_SECONDS } from '../accessToken'

const SECRET = 'a'.repeat(32)

describe('accessToken', () => {
  it('signs a token that expires in 24 hours', () => {
    const token = signAccessToken(
      { sub: 'user-1', workspaceId: 'ws-1', role: UserRole.Owner, permissions: [Permission.CampaignView] },
      SECRET,
    )

    const decoded = jwt.decode(token) as { iat: number; exp: number }
    expect(decoded.exp - decoded.iat).toBe(ACCESS_TOKEN_TTL_SECONDS)
    expect(ACCESS_TOKEN_TTL_SECONDS).toBe(24 * 60 * 60)
  })

  it('round-trips payload through verifyAccessToken', () => {
    const token = signAccessToken(
      { sub: 'user-1', workspaceId: 'ws-1', role: UserRole.Admin, permissions: [Permission.CampaignExecute] },
      SECRET,
    )

    const payload = verifyAccessToken(token, SECRET)
    expect(payload.sub).toBe('user-1')
    expect(payload.workspaceId).toBe('ws-1')
    expect(payload.role).toBe(UserRole.Admin)
    expect(payload.permissions).toEqual([Permission.CampaignExecute])
  })

  it('throws on invalid signature', () => {
    const token = signAccessToken(
      { sub: 'user-1', workspaceId: 'ws-1', role: UserRole.Viewer, permissions: [] },
      SECRET,
    )
    expect(() => verifyAccessToken(token, 'b'.repeat(32))).toThrow()
  })
})
