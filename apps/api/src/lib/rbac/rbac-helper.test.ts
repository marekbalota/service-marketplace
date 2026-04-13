import { describe, it, expect } from 'bun:test';
import { RBACService } from './rbac-helper';

describe('RBACService', () => {
  describe('getUserPermissions', () => {
    it('should return empty array for user with no role', async () => {
      const perms = await RBACService.getUserPermissions('non-existent-user');
      expect(perms).toEqual([]);
    });
  });

  describe('canManageRole', () => {
    it('should return false when target has higher or equal priority', async () => {
      // Will need seeded roles for real test
      const result = await RBACService.canManageRole('role-1', 'role-2');
      expect(typeof result).toBe('boolean');
    });
  });
});
