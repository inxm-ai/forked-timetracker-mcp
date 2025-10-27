import { NextRequest } from 'next/server';
import { auth } from './auth';
import { getExternalAuthMode, authenticateViaProxy } from './external-auth';

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
 * Get user ID without throwing an error. Returns null if unauthenticated.
 */
export async function getUserIdOrNull(req: NextRequest): Promise<string | null> {
  try {
    return await getUserIdOrThrow(req);
  } catch {
    return null;
  }
}
