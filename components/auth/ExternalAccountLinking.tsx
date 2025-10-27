'use client';

/**
 * External Account Linking Component
 * 
 * Displays linked external OAuth accounts and allows linking/unlinking.
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface LinkedAccount {
    provider: string;
    externalId: string;
    externalEmail: string;
}

interface LinkingData {
    linkedAccount: LinkedAccount | null;
}

export function ExternalAccountLinking() {
    const [linkingData, setLinkingData] = useState<LinkingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [unlinking, setUnlinking] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchLinkingData();
    }, []);

    async function fetchLinkingData() {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/auth/external/link');

            if (!response.ok) {
                throw new Error('Failed to fetch linking data');
            }

            const data = await response.json();
            setLinkingData(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load linking data');
        } finally {
            setLoading(false);
        }
    }

    async function handleUnlink() {
        if (!confirm('Are you sure you want to unlink this external account?')) {
            return;
        }

        try {
            setUnlinking(true);
            setError(null);

            const response = await fetch('/api/auth/external/link', {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to unlink account');
            }

            // Refresh data
            await fetchLinkingData();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to unlink account');
        } finally {
            setUnlinking(false);
        }
    }

    function getProviderDisplayName(provider: string): string {
        const names: Record<string, string> = {
            google: 'Google',
            github: 'GitHub',
            entra: 'Microsoft Entra ID',
            custom: 'Custom OAuth',
            proxy: 'OAuth Proxy',
        };
        return names[provider] || provider;
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>External Account Linking</CardTitle>
                    <CardDescription>Loading...</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>External Account Linking</CardTitle>
                <CardDescription>
                    Link external OAuth accounts to your profile for unified authentication
                </CardDescription>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                        {error}
                    </div>
                )}

                {linkingData?.linkedAccount ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                        {getProviderDisplayName(linkingData.linkedAccount.provider)}
                                    </span>
                                    <Badge variant="secondary">Linked</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    {linkingData.linkedAccount.externalEmail}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    ID: {linkingData.linkedAccount.externalId}
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleUnlink}
                                disabled={unlinking}
                            >
                                {unlinking ? 'Unlinking...' : 'Unlink'}
                            </Button>
                        </div>

                        <Separator />

                        <div className="text-sm text-muted-foreground">
                            <p>
                                When an external account is linked, you can sign in using either your
                                regular credentials or through the external OAuth provider.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="p-4 border border-dashed rounded-lg text-center">
                            <p className="text-sm text-muted-foreground mb-2">
                                No external accounts linked
                            </p>
                            <p className="text-xs text-muted-foreground">
                                External account linking is configured through environment variables
                                and OAuth provider settings. Contact your administrator for more information.
                            </p>
                        </div>

                        <Separator />

                        <div className="text-sm text-muted-foreground space-y-2">
                            <p className="font-medium">Supported Providers:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2">
                                <li>Google OAuth</li>
                                <li>GitHub OAuth</li>
                                <li>Microsoft Entra ID (Azure AD)</li>
                                <li>Custom OAuth / OIDC providers</li>
                                <li>OAuth Proxy with signed JWT</li>
                            </ul>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
