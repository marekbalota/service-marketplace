// Shared permissions - used by both API and Web
// This is the single source of truth for all permission strings

export const Permissions = {
  // Post Permissions
  PostsCreate: 'posts:create',
  PostsEditOwn: 'posts:edit:own',
  PostsEditAny: 'posts:edit:any',
  PostsDeleteOwn: 'posts:delete:own',

  // Admin - Post Management
  AdminPostsDeleteAny: 'admin:posts:delete:any',

  // Admin - User Management
  AdminUsersBan: 'admin:users:ban',
  AdminUsersView: 'admin:users:view',
  AdminUsersAssignRole: 'admin:users:assign-role',
  AdminUsersImpersonate: 'admin:users:impersonate',

  // Admin - Role Management
  AdminRolesManage: 'admin:roles:manage',

  // Admin - Category Management
  AdminCategoriesManage: 'admin:categories:manage',
} as const

export type Permission = (typeof Permissions)[keyof typeof Permissions]

/**
 * Check if a user has all required permissions
 */
export function hasPermissions(userPermissions: string[], required: Permission[]): boolean {
  return required.every((p) => userPermissions.includes(p))
}

/**
 * Check if a user has any of the required permissions
 */
export function hasAnyPermission(userPermissions: string[], required: Permission[]): boolean {
  return required.some((p) => userPermissions.includes(p))
}
