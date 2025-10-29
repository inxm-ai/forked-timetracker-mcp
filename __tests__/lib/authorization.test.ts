/**
 * Authorization Service Tests
 * 
 * Tests for the role-based authorization system
 * Run with: npm test -- authorization.test.ts
 */

import { describe, it, expect } from '@jest/globals';
import {
  UserRole,
  Permission,
  RolePermissions,
  createAuthorizationContext,
  canViewAllTimesheets,
  canViewUserTimesheets,
  canViewReports,
  parseUserRole,
  hasPermission,
} from '@/lib/authorization';

describe('Authorization Service', () => {
  describe('parseUserRole', () => {
    it('should parse valid role strings', () => {
      expect(parseUserRole('hr')).toBe(UserRole.HR);
      expect(parseUserRole('HR')).toBe(UserRole.HR);
      expect(parseUserRole('manager')).toBe(UserRole.MANAGER);
      expect(parseUserRole('admin')).toBe(UserRole.ADMIN);
      expect(parseUserRole('user')).toBe(UserRole.USER);
    });

    it('should default to USER for invalid roles', () => {
      expect(parseUserRole('invalid')).toBe(UserRole.USER);
      expect(parseUserRole(null)).toBe(UserRole.USER);
      expect(parseUserRole(undefined)).toBe(UserRole.USER);
      expect(parseUserRole('')).toBe(UserRole.USER);
    });
  });

  describe('createAuthorizationContext', () => {
    it('should create context with single role string', () => {
      const context = createAuthorizationContext('user_123', 'hr');
      expect(context.userId).toBe('user_123');
      expect(context.roles).toEqual([UserRole.HR]);
    });

    it('should create context with multiple roles', () => {
      const context = createAuthorizationContext('user_123', ['hr', 'manager']);
      expect(context.roles).toEqual([UserRole.HR, UserRole.MANAGER]);
    });

    it('should default to USER role if none provided', () => {
      const context = createAuthorizationContext('user_123', null);
      expect(context.roles).toEqual([UserRole.USER]);
    });

    it('should include metadata', () => {
      const metadata = { directReports: ['user_456', 'user_789'] };
      const context = createAuthorizationContext('user_123', 'manager', metadata);
      expect(context.metadata?.directReports).toEqual(['user_456', 'user_789']);
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has the permission', () => {
      const context = createAuthorizationContext('user_123', 'hr');
      expect(hasPermission(context, Permission.VIEW_ALL_TIMESHEETS)).toBe(true);
    });

    it('should return false when user lacks the permission', () => {
      const context = createAuthorizationContext('user_123', 'user');
      expect(hasPermission(context, Permission.VIEW_ALL_TIMESHEETS)).toBe(false);
    });

    it('should check all roles', () => {
      const context = createAuthorizationContext('user_123', ['user', 'hr']);
      expect(hasPermission(context, Permission.VIEW_ALL_TIMESHEETS)).toBe(true);
    });
  });

  describe('canViewAllTimesheets', () => {
    it('should allow HR users', () => {
      const context = createAuthorizationContext('user_123', 'hr');
      const result = canViewAllTimesheets(context);
      expect(result.authorized).toBe(true);
    });

    it('should allow Admin users', () => {
      const context = createAuthorizationContext('user_123', 'admin');
      const result = canViewAllTimesheets(context);
      expect(result.authorized).toBe(true);
    });

    it('should deny regular users', () => {
      const context = createAuthorizationContext('user_123', 'user');
      const result = canViewAllTimesheets(context);
      expect(result.authorized).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should deny managers without VIEW_ALL_TIMESHEETS permission', () => {
      const context = createAuthorizationContext('user_123', 'manager');
      const result = canViewAllTimesheets(context);
      expect(result.authorized).toBe(false);
    });
  });

  describe('canViewUserTimesheets', () => {
    it('should allow users to view their own timesheets', () => {
      const context = createAuthorizationContext('user_123', 'user');
      const result = canViewUserTimesheets(context, 'user_123');
      expect(result.authorized).toBe(true);
    });

    it('should allow HR to view any user', () => {
      const context = createAuthorizationContext('user_hr', 'hr');
      const result = canViewUserTimesheets(context, 'user_123');
      expect(result.authorized).toBe(true);
    });

    it('should allow Admin to view any user', () => {
      const context = createAuthorizationContext('user_admin', 'admin');
      const result = canViewUserTimesheets(context, 'user_123');
      expect(result.authorized).toBe(true);
    });

    it('should deny regular users from viewing other users', () => {
      const context = createAuthorizationContext('user_123', 'user');
      const result = canViewUserTimesheets(context, 'user_456');
      expect(result.authorized).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should allow managers to view direct reports', () => {
      const context = createAuthorizationContext(
        'user_manager',
        'manager',
        { directReports: ['user_123', 'user_456'] }
      );
      const result = canViewUserTimesheets(context, 'user_123');
      expect(result.authorized).toBe(true);
    });

    it('should deny managers from viewing non-direct reports', () => {
      const context = createAuthorizationContext(
        'user_manager',
        'manager',
        { directReports: ['user_123', 'user_456'] }
      );
      const result = canViewUserTimesheets(context, 'user_789');
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('not in the manager\'s direct reports');
    });
  });

  describe('canViewReports', () => {
    it('should allow viewing own reports without target users', () => {
      const context = createAuthorizationContext('user_123', 'user');
      const result = canViewReports(context);
      expect(result.authorized).toBe(true);
    });

    it('should allow viewing own reports with empty array', () => {
      const context = createAuthorizationContext('user_123', 'user');
      const result = canViewReports(context, []);
      expect(result.authorized).toBe(true);
    });

    it('should allow viewing own reports when only own ID requested', () => {
      const context = createAuthorizationContext('user_123', 'user');
      const result = canViewReports(context, ['user_123']);
      expect(result.authorized).toBe(true);
    });

    it('should allow HR to view all reports', () => {
      const context = createAuthorizationContext('user_hr', 'hr');
      const result = canViewReports(context, ['user_123', 'user_456', 'user_789']);
      expect(result.authorized).toBe(true);
    });

    it('should deny regular users from viewing others\' reports', () => {
      const context = createAuthorizationContext('user_123', 'user');
      const result = canViewReports(context, ['user_456']);
      expect(result.authorized).toBe(false);
    });

    it('should allow managers to view direct reports\' reports', () => {
      const context = createAuthorizationContext(
        'user_manager',
        'manager',
        { directReports: ['user_123', 'user_456'] }
      );
      const result = canViewReports(context, ['user_123', 'user_456']);
      expect(result.authorized).toBe(true);
    });

    it('should deny managers from viewing non-direct reports', () => {
      const context = createAuthorizationContext(
        'user_manager',
        'manager',
        { directReports: ['user_123'] }
      );
      const result = canViewReports(context, ['user_123', 'user_789']);
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('user_789');
    });
  });

  describe('RolePermissions mapping', () => {
    it('should have correct permissions for USER role', () => {
      const permissions = RolePermissions[UserRole.USER];
      expect(permissions).toEqual([]);
    });

    it('should have correct permissions for HR role', () => {
      const permissions = RolePermissions[UserRole.HR];
      expect(permissions).toContain(Permission.VIEW_ALL_TIMESHEETS);
      expect(permissions).toContain(Permission.VIEW_ALL_REPORTS);
    });

    it('should have correct permissions for MANAGER role', () => {
      const permissions = RolePermissions[UserRole.MANAGER];
      expect(permissions).toContain(Permission.VIEW_USER_TIMESHEETS);
      expect(permissions).not.toContain(Permission.VIEW_ALL_TIMESHEETS);
    });

    it('should have correct permissions for ADMIN role', () => {
      const permissions = RolePermissions[UserRole.ADMIN];
      expect(permissions).toContain(Permission.VIEW_ALL_TIMESHEETS);
      expect(permissions).toContain(Permission.VIEW_ALL_REPORTS);
      expect(permissions).toContain(Permission.MANAGE_USERS);
    });
  });
});
