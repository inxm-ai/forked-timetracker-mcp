/**
 * Authorization Types and Role-Based Access Control (RBAC)
 * 
 * This module defines the role and permission system for the timetracker application.
 * It's designed to be extensible to support future authorization patterns like:
 * - Manager viewing direct reports
 * - API key-based access with specific scopes
 * - Department-based access control
 */

/**
 * User roles in the system
 * Roles can be stored in JWT tokens, database, or provided via external auth
 */
export enum UserRole {
  /** Regular user - can only view their own data */
  USER = 'user',
  
  /** HR role - can view all timesheets across the organization */
  HR = 'hr',
  
  /** Manager role - can view direct reports' timesheets (future: requires additional relationship data) */
  MANAGER = 'manager',
  
  /** Admin role - full system access */
  ADMIN = 'admin',
}

/**
 * Specific permissions that can be checked
 * This granular approach allows for flexible authorization logic
 */
export enum Permission {
  /** Can view all users' timesheets without restrictions */
  VIEW_ALL_TIMESHEETS = 'view_all_timesheets',
  
  /** Can view specific user's timesheets (used with additional context like manager-employee relationship) */
  VIEW_USER_TIMESHEETS = 'view_user_timesheets',
  
  /** Can manage users (future permission) */
  MANAGE_USERS = 'manage_users',
  
  /** Can view reports across all users (future permission) */
  VIEW_ALL_REPORTS = 'view_all_reports',
}

/**
 * Maps roles to their default permissions
 * This can be extended or customized based on organizational needs
 */
export const RolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    // Regular users can only view their own data (implicit, no special permission)
  ],
  
  [UserRole.HR]: [
    Permission.VIEW_ALL_TIMESHEETS,
    Permission.VIEW_ALL_REPORTS,
  ],
  
  [UserRole.MANAGER]: [
    Permission.VIEW_USER_TIMESHEETS, // With relationship validation
  ],
  
  [UserRole.ADMIN]: [
    Permission.VIEW_ALL_TIMESHEETS,
    Permission.VIEW_ALL_REPORTS,
    Permission.MANAGE_USERS,
  ],
};

/**
 * Authorization context for permission checks
 * Contains information about the authenticated user and the resource being accessed
 */
export interface AuthorizationContext {
  /** The authenticated user's ID */
  userId: string;
  
  /** The user's role(s) - can be multiple in some systems */
  roles: UserRole[];
  
  /** Optional: target user ID when checking permission to view another user's data */
  targetUserId?: string;
  
  /** Optional: additional context for extensibility (e.g., department, reporting relationships) */
  metadata?: {
    /** Employee IDs that this user manages (for manager role) */
    directReports?: string[];
    
    /** Department the user belongs to */
    department?: string;
    
    /** API key scopes if request is authenticated via API key */
    apiScopes?: string[];
  };
}

/**
 * Result of an authorization check
 */
export interface AuthorizationResult {
  /** Whether the action is authorized */
  authorized: boolean;
  
  /** Optional reason for denial (for logging/debugging) */
  reason?: string;
}
