'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Shield, User } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdminHeader from '@/components/navigation/AdminHeader';

interface ManagedAccountProps {
  user: {
    name?: string;
    email?: string;
    role?: string | null;
  };
  title: string;
}

// With proxy authentication (EXTERNAL_AUTH_MODE=proxy) the organization's
// identity provider owns the account: show it read-only and send changes
// there, instead of the Better Auth profile and password forms.
export default function ManagedAccount({ user, title }: ManagedAccountProps) {
  const router = useRouter();

  const headerActions = (
    <Button
      variant="outline"
      size="sm"
      onClick={() => router.back()}
      className="flex items-center gap-2"
    >
      <ArrowLeft className="h-4 w-4" />
      Back
    </Button>
  );

  return (
    <>
      <AdminHeader actions={headerActions} />

      <div className="container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {title}
          </h1>

          <Card className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {user.name || 'User'}
              </CardTitle>
              <CardDescription>
                Your account is managed by your organization&apos;s sign-in. Change your name,
                email or password there.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {user.email}
              </div>
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                {user.role || 'user'}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
