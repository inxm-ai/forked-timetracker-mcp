/**
 * External OAuth Callback Handler
 * 
 * Handles OAuth callbacks from external providers when using EXTERNAL_AUTH_MODE=better-auth.
 * This creates a local user and establishes a Better Auth session after successful OAuth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findOrCreateExternalUser } from '@/lib/external-auth';
import { env } from '@/lib/env';

export async function GET(req: NextRequest) {
    try {
        const mode = env.EXTERNAL_AUTH_MODE;

        // Only handle callbacks in better-auth mode
        if (mode !== 'better-auth') {
            return NextResponse.json(
                { error: 'External auth not configured in better-auth mode' },
                { status: 400 }
            );
        }

        // Better Auth handles the OAuth callback automatically
        // The account will be created via the Better Auth OAuth flow
        // We just need to ensure the session is established
        const session = await auth.api.getSession({ headers: req.headers });

        if (!session || !session.user) {
            return NextResponse.json(
                { error: 'OAuth authentication failed' },
                { status: 401 }
            );
        }
        const redirectUrl = new URL('/dashboard', req.url);
        return NextResponse.redirect(redirectUrl);

    } catch (error) {
        console.error('External auth callback error:', error);
        const redirectUrl = new URL('/login', req.url);
        redirectUrl.searchParams.set('error', 'oauth_callback_failed');
        return NextResponse.redirect(redirectUrl);
    }
}
