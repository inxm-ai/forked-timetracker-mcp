# Authorization Module

This module provides role-based access control (RBAC) for the timetracker application.

## Quick Start

### 1. Import the authorization service

```typescript
import { 
  createAuthorizationContext, 
  canViewAllTimesheets,
  canViewUserTimesheets 
} from '@/lib/authorization';
```

### 2. Create an authorization context

```typescript
// From your API route after authentication
const user = await getAuthenticatedUser(req);

const authContext = createAuthorizationContext(
  user.userId,   // Authenticated user's ID
  user.role      // User's role(s)
);
```

### 3. Check permissions

```typescript
// Check if user can view all timesheets
const canViewAll = canViewAllTimesheets(authContext);

if (!canViewAll.authorized) {
  return new Response(
    JSON.stringify({ error: 'Forbidden', reason: canViewAll.reason }), 
    { status: 403 }
  );
}

// Check if user can view specific user's timesheets
const canView = canViewUserTimesheets(authContext, targetUserId);

if (!canView.authorized) {
  return new Response(
    JSON.stringify({ error: 'Forbidden', reason: canView.reason }), 
    { status: 403 }
  );
}
```

## Files

- **`types.ts`**: Core types, roles, permissions, and role-permission mappings
- **`service.ts`**: Authorization logic and permission checking functions
- **`index.ts`**: Module exports

## User Roles

- **`USER`**: Regular user (default)
- **`HR`**: Can view all timesheets across organization
- **`MANAGER`**: Can view direct reports' timesheets
- **`ADMIN`**: Full system access

## Permissions

- **`VIEW_ALL_TIMESHEETS`**: View any user's timesheets without restrictions
- **`VIEW_USER_TIMESHEETS`**: View specific users' timesheets (with relationship validation)
- **`VIEW_ALL_REPORTS`**: View reports across all users
- **`MANAGE_USERS`**: Manage user accounts (future)

## Extension Points

The system is designed to be extensible:

### Manager-Direct Report Relationships

```typescript
const directReports = await loadDirectReports(managerId);
const authContext = createAuthorizationContext(
  managerId, 
  'manager',
  { directReports }
);
```

### API Key-Based Access

```typescript
const authContext = createAuthorizationContext(
  userId,
  role,
  { apiScopes: ['read:timesheets', 'read:reports'] }
);
```

### Department-Based Access

```typescript
const authContext = createAuthorizationContext(
  userId,
  role,
  { department: 'Engineering' }
);
```

## Documentation

See [docs/AUTHORIZATION.md](../../docs/AUTHORIZATION.md) for comprehensive documentation including:

- Detailed architecture overview
- API usage examples
- How to extend for different use cases
- Security considerations
- Testing guide

## Example Usage in API Routes

```typescript
import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/authUtils";
import { createAuthorizationContext, canViewUserTimesheets } from "@/lib/authorization";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url!);
    const targetUserId = url.searchParams.get("userId");
    
    // Check authorization if requesting another user's data
    if (targetUserId && targetUserId !== user.userId) {
      const authContext = createAuthorizationContext(user.userId, user.role);
      const authResult = canViewUserTimesheets(authContext, targetUserId);
      
      if (!authResult.authorized) {
        return new Response(
          JSON.stringify({ error: 'Forbidden', reason: authResult.reason }), 
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Proceed with data access...
  } catch (err) {
    // Error handling...
  }
}
```
