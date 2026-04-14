export const Permissions = {
  // Post Permissions
  PostsCreate: 'posts:create',
  PostsEditOwn: 'posts:edit:own',
  PostsEditAny: 'posts:edit:any',
  PostsDeleteOwn: 'posts:delete:own',
  PostsDeleteAny: 'posts:delete:any',

  // Admin - User Management
  AdminUsersBan: 'admin:users:ban',
  AdminUsersView: 'admin:users:view',
  AdminUsersAssignRole: 'admin:users:assign-role',

  // Admin - Role Management
  AdminRolesManage: 'admin:roles:manage',

  // Admin - Category Management
  AdminCategoriesManage: 'admin:categories:manage',
} as const;

export type PermissionType = typeof Permissions[keyof typeof Permissions];
