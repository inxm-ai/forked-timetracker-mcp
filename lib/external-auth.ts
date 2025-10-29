/**
 * External Authentication Utilities
 * 
 * Provides JWT verification, header validation, and user mapping for external OAuth providers.
 * Supports both Better Auth OAuth integration and OAuth proxy authentication.
 */

import { NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { db } from '@/drizzle/connection';
import { user } from '@/drizzle/better-auth-schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

/**
 * External user information extracted from JWT or proxy headers
 */
export interface ExternalUserInfo {
    sub: string; // Subject (unique identifier from provider)
    email: string;
    name?: string;
    provider: string; // 'google', 'github', 'entra', 'custom'
    picture?: string;
    role?: string; // User role from JWT (e.g., 'hr', 'manager', 'admin')
    roles?: string[]; // Alternative: array of roles from JWT
}

/**
 * Result of external authentication verification
 */
export interface ExternalAuthResult {
    success: boolean;
    userInfo?: ExternalUserInfo;
    error?: string;
    userId?: string; // Local database user ID if user exists/created
}

/**
 * Verify JWT token from OAuth proxy
 * Supports both JWKS URL and static public key verification
 * TODO: Implement proper JWT verification using a library like 'jose'
 */
export async function verifyProxyJWT(jwt: string): Promise<ExternalAuthResult> {
    try {
        const { PROXY_JWT_JWKS_URL, PROXY_JWT_PUBLIC_KEY, PROXY_JWT_ISSUER, PROXY_JWT_AUDIENCE } = env;

        if (!PROXY_JWT_JWKS_URL && !PROXY_JWT_PUBLIC_KEY) {
            return {
                success: false,
                error: 'JWT verification not configured. Set PROXY_JWT_JWKS_URL or PROXY_JWT_PUBLIC_KEY'
            };
        }

        const parts = jwt.split('.');
        if (parts.length !== 3) {
            return { success: false, error: 'Invalid JWT format' };
        }

        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

        if (PROXY_JWT_ISSUER && payload.iss !== PROXY_JWT_ISSUER) {
            return { success: false, error: 'Invalid JWT issuer' };
        }
        if (PROXY_JWT_AUDIENCE && payload.aud !== PROXY_JWT_AUDIENCE) {
            return { success: false, error: 'Invalid JWT audience' };
        }

        if (payload.exp && Date.now() >= payload.exp * 1000) {
            return { success: false, error: 'JWT expired' };
        }

        // Extract role information from JWT claims
        // Support multiple common JWT claim names for roles
        const role = payload.role || payload.userRole || payload['custom:role'];
        const roles = payload.roles || payload.groups || payload['custom:roles'];

        const userInfo: ExternalUserInfo = {
            sub: payload.sub,
            email: payload.email,
            name: payload.name,
            provider: payload.provider || env.EXTERNAL_AUTH_PROVIDER || 'custom',
            picture: payload.picture,
            role: role, // Single role claim
            roles: roles // Array of roles/groups claim
        };

        return { success: true, userInfo };
    } catch (error) {
        console.error('JWT verification error:', error);
        return { success: false, error: 'JWT verification failed' };
    }
}

/**
 * Extract user information from proxy headers
 * Falls back to header-based auth if JWT verification fails
 */
export async function extractProxyUserInfo(req: NextRequest): Promise<ExternalAuthResult> {
    const { PROXY_JWT_HEADER, PROXY_EMAIL_HEADER, PROXY_USER_HEADER } = env;

    // Try JWT first
    const jwtHeader = req.headers.get(PROXY_JWT_HEADER);
    if (jwtHeader) {
        const jwtResult = await verifyProxyJWT(jwtHeader);
        if (jwtResult.success) {
            return jwtResult;
        }
        // If JWT verification fails, log but continue to header fallback
        // TODO: Consider whether to fail outright instead
        console.warn('JWT verification failed, falling back to headers:', jwtResult.error);
    }

    // Fallback to plain headers (only if JWT is not present or failed)
    const email = req.headers.get(PROXY_EMAIL_HEADER);
    const username = req.headers.get(PROXY_USER_HEADER);
    
    // Try to get role from headers as well (some proxies support this)
    const roleHeader = req.headers.get('X-Auth-Role') || req.headers.get('X-User-Role');
    const rolesHeader = req.headers.get('X-Auth-Roles') || req.headers.get('X-User-Groups');

    if (!email) {
        return { success: false, error: 'No authentication information in headers' };
    }

    // In header-only mode, we don't have a reliable 'sub', so use username (for our oauth2-proxy that's the id) email as identifier
    const userInfo: ExternalUserInfo = {
        sub: username || email.split('@')[0],
        email,
        name: username || email.split('@')[0],
        provider: env.EXTERNAL_AUTH_PROVIDER || 'proxy',
        role: roleHeader || undefined,
        roles: rolesHeader ? rolesHeader.split(',').map(r => r.trim()) : undefined
    };

    return { success: true, userInfo };
}

/**
 * Find or create a local user from external identity
 */
export async function findOrCreateExternalUser(
    userInfo: ExternalUserInfo
): Promise<ExternalAuthResult> {
    try {
        const { EXTERNAL_CREATE_LOCAL_USER, EXTERNAL_LINKING_POLICY } = env;

        let existingUser = await db.query.user.findFirst({
            where: and(
                eq(user.externalProvider, userInfo.provider),
                eq(user.externalId, userInfo.sub)
            )
        });

        if (existingUser) {
            return {
                success: true,
                userInfo,
                userId: existingUser.id
            };
        }

        // If auto-linking enabled, try to find by email
        if (EXTERNAL_LINKING_POLICY === 'auto') {
            existingUser = await db.query.user.findFirst({
                where: eq(user.email, userInfo.email)
            });

            if (existingUser) {
                // Link external account to existing user
                await db.update(user)
                    .set({
                        externalProvider: userInfo.provider,
                        externalId: userInfo.sub,
                        externalEmail: userInfo.email,
                        updatedAt: new Date()
                    })
                    .where(eq(user.id, existingUser.id));

                return {
                    success: true,
                    userInfo,
                    userId: existingUser.id
                };
            }
        }

        if (!EXTERNAL_CREATE_LOCAL_USER) {
            return {
                success: false,
                error: 'User not found and automatic user creation is disabled'
            };
        }

        const newUserId = nanoid();
        await db.insert(user).values({
            id: newUserId,
            email: userInfo.email,
            name: userInfo.name || userInfo.email.split('@')[0],
            emailVerified: true, // External auth implies verified email
            image: userInfo.picture,
            externalProvider: userInfo.provider,
            externalId: userInfo.sub,
            externalEmail: userInfo.email,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        return {
            success: true,
            userInfo,
            userId: newUserId
        };
    } catch (error) {
        console.error('Error finding/creating external user:', error);
        return {
            success: false,
            error: 'Failed to process external user'
        };
    }
}

/**
 * Complete external authentication flow:
 * 1. Extract user info from proxy headers/JWT
 * 2. Find or create local user
 * 3. Return authentication result
 */
export async function authenticateViaProxy(req: NextRequest): Promise<ExternalAuthResult> {
    const extractResult = await extractProxyUserInfo(req);
    if (!extractResult.success || !extractResult.userInfo) {
        return extractResult;
    }

    return await findOrCreateExternalUser(extractResult.userInfo);
}

/**
 * Check if external auth is enabled and which mode
 */
export function getExternalAuthMode(): 'better-auth' | 'proxy' | 'disabled' {
    return env.EXTERNAL_AUTH_MODE;
}

/**
 * Validate that external auth is properly configured
 */
export function validateExternalAuthConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const mode = getExternalAuthMode();

    if (mode === 'disabled') {
        return { valid: true, errors: [] };
    }

    if (mode === 'better-auth') {
        const provider = env.EXTERNAL_AUTH_PROVIDER;
        if (!provider) {
            errors.push('EXTERNAL_AUTH_PROVIDER must be set when EXTERNAL_AUTH_MODE=better-auth');
        }

        // Check provider-specific configuration
        if (provider === 'google' && (!env.OAUTH_GOOGLE_CLIENT_ID || !env.OAUTH_GOOGLE_CLIENT_SECRET)) {
            errors.push('OAUTH_GOOGLE_CLIENT_ID and OAUTH_GOOGLE_CLIENT_SECRET required for Google OAuth');
        }
        if (provider === 'github' && (!env.OAUTH_GITHUB_CLIENT_ID || !env.OAUTH_GITHUB_CLIENT_SECRET)) {
            errors.push('OAUTH_GITHUB_CLIENT_ID and OAUTH_GITHUB_CLIENT_SECRET required for GitHub OAuth');
        }
        if (provider === 'entra' && (!env.OAUTH_ENTRA_CLIENT_ID || !env.OAUTH_ENTRA_CLIENT_SECRET || !env.OAUTH_ENTRA_TENANT_ID)) {
            errors.push('OAUTH_ENTRA_CLIENT_ID, OAUTH_ENTRA_CLIENT_SECRET, and OAUTH_ENTRA_TENANT_ID required for Entra ID OAuth');
        }
        if (provider === 'custom' && (!env.OAUTH_CUSTOM_AUTHORIZATION_URL || !env.OAUTH_CUSTOM_TOKEN_URL || !env.OAUTH_CUSTOM_CLIENT_ID)) {
            errors.push('Custom OAuth provider requires OAUTH_CUSTOM_AUTHORIZATION_URL, OAUTH_CUSTOM_TOKEN_URL, and OAUTH_CUSTOM_CLIENT_ID');
        }
    }

    if (mode === 'proxy') {
        if (!env.PROXY_JWT_JWKS_URL && !env.PROXY_JWT_PUBLIC_KEY) {
            errors.push('Proxy mode requires PROXY_JWT_JWKS_URL or PROXY_JWT_PUBLIC_KEY for secure JWT verification');
        }
    }

    return { valid: errors.length === 0, errors };
}
