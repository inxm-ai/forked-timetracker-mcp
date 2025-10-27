import { NextResponse } from 'next/server';
import { env } from '@/lib/env';

/**
 * GET /api/auth/external/config
 * Returns the external auth configuration for the client
 */
export async function GET() {
    return NextResponse.json({
        mode: env.EXTERNAL_AUTH_MODE,
        provider: env.EXTERNAL_AUTH_PROVIDER,
    });
}
