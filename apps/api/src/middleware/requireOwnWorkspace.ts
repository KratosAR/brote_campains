import { Request, Response, NextFunction } from 'express'

// Domain today is 1 user = 1 membership = 1 workspace (see
// IWorkspaceUserRepository.findByUserId, which returns a single record, not
// a list), so the JWT's workspaceId claim IS the user's full authorization
// scope. Mount this once per :id-scoped router — every route under it is
// covered, no per-handler guard to forget.
// ponytail: revisit if/when a user can belong to multiple workspaces —
// then this must check membership via a repository lookup instead of the
// JWT claim.
export function requireOwnWorkspace(req: Request, res: Response, next: NextFunction): void {
  if (req.user!.workspaceId !== String(req.params.id)) {
    res.status(403).json({ success: false, error: 'Insufficient permissions' })
    return
  }
  next()
}
