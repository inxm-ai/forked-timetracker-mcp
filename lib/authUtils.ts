import { NextRequest } from 'next/server';
import { auth } from './auth';
import { getExternalAuthMode, authenticateViaProxy } from './external-auth';
import { db } from '@/drizzle/connection';
import { user as userTable } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';

/**
 * User information including role for authorization
 */
export interface AuthenticatedUser {
  userId: string;
  role: string | null;
  email?: string;
  name?: string;
}

/**
 * Extracts the authenticated user id from the session.
 * Supports both Better Auth sessions and external OAuth proxy authentication.
 * Throws a 401 Response if the request is unauthenticated.
 */
export async function getUserIdOrThrow(req: NextRequest): Promise<string> {
  const externalAuthMode = getExternalAuthMode();

  // If proxy mode is enabled, try proxy authentication first
  if (externalAuthMode === 'proxy') {
    const proxyAuth = await authenticateViaProxy(req);
    if (proxyAuth.success && proxyAuth.userId) {
      return proxyAuth.userId;
    }
    // If proxy auth fails, fall through to Better Auth (for backward compatibility)
    console.warn('Proxy authentication failed, falling back to Better Auth:', proxyAuth.error);
  }

  // Use Better Auth session (default or fallback)
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || !session.user?.id) {
    throw new Response('Unauthorized', { status: 401 });
  }
  return session.user.id as string;
}

/**
 * Get authenticated user with role information
 * This fetches the user's role from the database for authorization checks
 * Throws a 401 Response if the request is unauthenticated.
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthenticatedUser> {
  const externalAuthMode = getExternalAuthMode();

  // If proxy mode is enabled, try proxy authentication first
  if (externalAuthMode === 'proxy') {
    const proxyAuth = await authenticateViaProxy(req);
    if (proxyAuth.success && proxyAuth.userId) {
      // For proxy auth, fetch user from database to get role
      const [user] = await db
        .select({
          id: userTable.id,
          role: userTable.role,
          email: userTable.email,
          name: userTable.name,
        })
        .from(userTable)
        .where(eq(userTable.id, proxyAuth.userId))
        .limit(1);

      if (!user) {
        throw new Response('User not found', { status: 401 });
      }

      // Prefer role from JWT if available, otherwise use database role
      const effectiveRole = proxyAuth.userInfo?.role || 
                           (proxyAuth.userInfo?.roles && proxyAuth.userInfo.roles.length > 0 
                             ? proxyAuth.userInfo.roles[0] 
                             : null) ||
                           user.role;

      return {
        userId: user.id,
        role: effectiveRole,
        email: user.email,
        name: user.name,
      };
    }
    // If proxy auth fails, fall through to Better Auth (for backward compatibility)
    console.warn('Proxy authentication failed, falling back to Better Auth:', proxyAuth.error);
  }

  // Use Better Auth session (default or fallback)
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session || !session.user?.id) {
    throw new Response('Unauthorized', { status: 401 });
  }

  // Fetch user from database to get role information
  // Better Auth session might not include role in the token
  const [user] = await db
    .select({
      id: userTable.id,
      role: userTable.role,
      email: userTable.email,
      name: userTable.name,
    })
    .from(userTable)
    .where(eq(userTable.id, session.user.id as string))
    .limit(1);

  if (!user) {
    throw new Response('User not found', { status: 401 });
  }

  return {
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  };
}

/**
 * Get user ID without throwing an error. Returns null if unauthenticated.
 */
export async function getUserIdOrNull(req: NextRequest): Promise<string | null> {
  try {
    return await getUserIdOrThrow(req);
  } catch {
    return null;
  }
}

/**
 * Get authenticated user without throwing an error. Returns null if unauthenticated.
 */
export async function getAuthenticatedUserOrNull(req: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    return await getAuthenticatedUser(req);
  } catch {
    return null;
  }
}
