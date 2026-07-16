export { ApiClient, apiClient, type ApiResponse } from './client'
export {
  register,
  login,
  logout,
  refreshToken,
  getCurrentUser,
  type RegisterInput,
  type RegisterOutput,
  type LoginInput,
  type LoginOutput,
  type User
} from './auth'
export {
  getWorkspace,
  updateWorkspace,
  inviteUser,
  type Workspace,
  type WorkspaceSettings,
  type WorkspaceUser,
  type InviteUserInput,
  type InviteUserOutput
} from './workspaces'
export {
  listChannels,
  testConnection,
  connectChannel,
  disconnectChannel,
  healthCheckChannel,
  type ChannelType,
  type ProviderName,
  type ChannelConnection,
  type TestConnectionInput,
  type ConnectChannelInput,
  type HealthCheckResult
} from './channels'
export {
  listContacts,
  searchContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  optOutContact,
  importContacts,
  getImportJobStatus,
  listGroups,
  createGroup,
  type Contact,
  type CreateContactInput,
  type UpdateContactInput,
  type ContactGroup,
  type CreateGroupInput,
  type ImportJobStatus
} from './contacts'
