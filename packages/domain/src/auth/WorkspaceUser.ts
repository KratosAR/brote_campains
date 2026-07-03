import { ValueObject } from '../shared/ValueObject'
import { UserId } from './UserId'
import { UserRole } from './UserRole'
import { WorkspaceId } from '../workspace/WorkspaceId'

interface WorkspaceUserProps {
  userId: UserId
  workspaceId: WorkspaceId
  role: UserRole
  invitedAt: Date
  joinedAt?: Date
}

export class WorkspaceUser extends ValueObject<WorkspaceUserProps> {
  private constructor(props: WorkspaceUserProps) {
    super(props)
  }

  static create(props: WorkspaceUserProps): WorkspaceUser {
    return new WorkspaceUser({ ...props })
  }

  get userId(): UserId {
    return this.props.userId
  }

  get workspaceId(): WorkspaceId {
    return this.props.workspaceId
  }

  get role(): UserRole {
    return this.props.role
  }

  get invitedAt(): Date {
    return this.props.invitedAt
  }

  get joinedAt(): Date | undefined {
    return this.props.joinedAt
  }
}
