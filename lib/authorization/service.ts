/**
 * Authorization Service
 * 
 * Provides modular authorization logic for checking permissions.
 * This service is designed to be extensible for future authorization patterns.
 */

import { 
  UserRole, 
  Permission, 
  RolePermissions, 
  AuthorizationContext, 
  AuthorizationResult 
} from './types';

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  context: AuthorizationContext, 
  permission: Permission
): boolean {
  // Check each role the user has
  for (const role of context.roles) {
    const permissions = RolePermissions[role];
    if (permissions.includes(permission)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a user can view all timesheets (HR/Admin access)
 */
export function canViewAllTimesheets(context: AuthorizationContext): AuthorizationResult {
  const authorized = hasPermission(context, Permission.VIEW_ALL_TIMESHEETS);
  
  return {
    authorized,
    reason: authorized 
      ? undefined 
      : `User with roles [${context.roles.join(', ')}] does not have permission to view all timesheets`
  };
}

/**
 * Check if a user can view a specific user's timesheets
 * This handles multiple scenarios:
 * 1. Viewing own timesheets (always allowed)
 * 2. HR/Admin viewing anyone's timesheets
 * 3. Manager viewing direct reports' timesheets (requires relationship data)
 */
export function canViewUserTimesheets(
  context: AuthorizationContext,
  targetUserId: string
): AuthorizationResult {
  // Users can always view their own timesheets
  if (context.userId === targetUserId) {
    return { authorized: true };
  }

  // Check if user has blanket permission to view all timesheets (HR/Admin)
  if (hasPermission(context, Permission.VIEW_ALL_TIMESHEETS)) {
    return { authorized: true };
  }

  // Check manager-specific logic (requires relationship data)
  if (hasPermission(context, Permission.VIEW_USER_TIMESHEETS)) {
    // Future extension point: Check if targetUserId is in the manager's direct reports
    const directReports = context.metadata?.directReports || [];
    
    if (directReports.includes(targetUserId)) {
      return { authorized: true };
    }
    
    return {
      authorized: false,
      reason: `User ${targetUserId} is not in the manager's direct reports`
    };
  }

  return {
    authorized: false,
    reason: `User with roles [${context.roles.join(', ')}] cannot view timesheets for user ${targetUserId}`
  };
}

/**
 * Check if a user can view reports (potentially across multiple users)
 * 
 * @param context - Authorization context
 * @param targetUserIds - Optional array of user IDs to check access for. 
 *                        If undefined, checks for general report access.
 *                        If empty array, checks for own reports only.
 */
export function canViewReports(
  context: AuthorizationContext,
  targetUserIds?: string[]
): AuthorizationResult {
  // If no specific users requested, check for general report access
  if (targetUserIds === undefined) {
    return { authorized: true }; // Users can always view their own reports
  }

  // If empty array, user is viewing their own reports
  if (targetUserIds.length === 0) {
    return { authorized: true };
  }

  // If requesting multiple users or other users' reports
  const requestingOtherUsers = targetUserIds.some(id => id !== context.userId);
  
  if (!requestingOtherUsers) {
    return { authorized: true }; // Only requesting own reports
  }

  // Check if user has permission to view all reports
  if (hasPermission(context, Permission.VIEW_ALL_TIMESHEETS)) {
    return { authorized: true };
  }

  // Check manager permissions for each requested user
  if (hasPermission(context, Permission.VIEW_USER_TIMESHEETS)) {
    const directReports = context.metadata?.directReports || [];
    const unauthorizedUsers = targetUserIds.filter(
      id => id !== context.userId && !directReports.includes(id)
    );
    
    if (unauthorizedUsers.length === 0) {
      return { authorized: true };
    }
    
    return {
      authorized: false,
      reason: `Cannot view reports for users: ${unauthorizedUsers.join(', ')}`
    };
  }

  return {
    authorized: false,
    reason: `User with roles [${context.roles.join(', ')}] cannot view reports for other users`
  };
}

/**
 * Utility function to parse role from string (case-insensitive)
 * Returns USER role if the role string is invalid or unknown
 */
export function parseUserRole(roleString: string | null | undefined): UserRole {
  if (!roleString) {
    return UserRole.USER;
  }

  const normalized = roleString.toLowerCase();
  
  switch (normalized) {
    case 'hr':
      return UserRole.HR;
    case 'manager':
      return UserRole.MANAGER;
    case 'admin':
      return UserRole.ADMIN;
    case 'user':
    default:
      return UserRole.USER;
  }
}

/**
 * Create an authorization context from user data
 * This is the main entry point for creating authorization contexts
 * 
 * @param userId - The authenticated user's ID
 * @param roles - Role(s) as string(s) from JWT, database, or external auth
 * @param metadata - Optional additional context (direct reports, etc.)
 */
export function createAuthorizationContext(
  userId: string,
  roles: string | string[] | null | undefined,
  metadata?: AuthorizationContext['metadata']
): AuthorizationContext {
  // Normalize roles to array
  let roleArray: string[];
  if (Array.isArray(roles)) {
    roleArray = roles;
  } else if (typeof roles === 'string') {
    roleArray = [roles];
  } else {
    roleArray = [];
  }

  // Parse and validate roles
  const parsedRoles = roleArray.length > 0 
    ? roleArray.map(parseUserRole)
    : [UserRole.USER]; // Default to USER role if none specified

  return {
    userId,
    roles: parsedRoles,
    metadata,
  };
}

/**
 * Extension point: Load manager's direct reports from database
 * This is a placeholder for future implementation
 */
export async function loadDirectReports(managerId: string): Promise<string[]> {
  // TODO: Implement this when adding manager-employee relationship table
  // Example implementation:
  // const reports = await db
  //   .select({ employeeId: employeeRelationships.employeeId })
  //   .from(employeeRelationships)
  //   .where(eq(employeeRelationships.managerId, managerId));
  // return reports.map(r => r.employeeId);
  
  return [];
}
