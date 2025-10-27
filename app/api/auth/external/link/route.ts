/**
 * Account Linking API
 * 
 * Allows users to link/unlink external OAuth accounts to their existing account.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserIdOrThrow } from '@/lib/authUtils';
import { db } from '@/drizzle/connection';
import { user } from '@/drizzle/better-auth-schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/auth/external/link
 * Get linked external accounts for the current user
 */
export async function GET(req: NextRequest) {
    try {
        const userId = await getUserIdOrThrow(req);

        const userRecord = await db.query.user.findFirst({
            where: eq(user.id, userId),
            columns: {
                id: true,
                email: true,
                externalProvider: true,
                externalId: true,
                externalEmail: true,
            }
        });

        if (!userRecord) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            linkedAccount: userRecord.externalProvider ? {
                provider: userRecord.externalProvider,
                externalId: userRecord.externalId,
                externalEmail: userRecord.externalEmail,
            } : null
        });

    } catch (error) {
        if (error instanceof Response) return error;
        console.error('Error fetching linked accounts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch linked accounts' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/auth/external/link
 * Link an external account to the current user
 * 
 * Body: { provider: string, externalId: string, externalEmail: string }
 */
export async function POST(req: NextRequest) {
    try {
        const userId = await getUserIdOrThrow(req);
        const body = await req.json();

        const { provider, externalId, externalEmail } = body;

        if (!provider || !externalId || !externalEmail) {
            return NextResponse.json(
                { error: 'Missing required fields: provider, externalId, externalEmail' },
                { status: 400 }
            );
        }

        const existingLink = await db.query.user.findFirst({
            where: eq(user.externalId, externalId)
        });
        if (existingLink && existingLink.id !== userId) {
            return NextResponse.json(
                { error: 'This external account is already linked to another user' },
                { status: 409 }
            );
        }

        await db.update(user)
            .set({
                externalProvider: provider,
                externalId: externalId,
                externalEmail: externalEmail,
                updatedAt: new Date()
            })
            .where(eq(user.id, userId));

        return NextResponse.json({
            success: true,
            message: 'External account linked successfully'
        });

    } catch (error) {
        if (error instanceof Response) return error;
        console.error('Error linking external account:', error);
        return NextResponse.json(
            { error: 'Failed to link external account' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/auth/external/link
 * Unlink external account from the current user
 */
export async function DELETE(req: NextRequest) {
    try {
        const userId = await getUserIdOrThrow(req);

        await db.update(user)
            .set({
                externalProvider: null,
                externalId: null,
                externalEmail: null,
                updatedAt: new Date()
            })
            .where(eq(user.id, userId));

        return NextResponse.json({
            success: true,
            message: 'External account unlinked successfully'
        });

    } catch (error) {
        if (error instanceof Response) return error;
        console.error('Error unlinking external account:', error);
        return NextResponse.json(
            { error: 'Failed to unlink external account' },
            { status: 500 }
        );
    }
}
