"use client";

import { useState, useEffect } from "react";
import { authClient } from "@/lib/authClient";

interface UnifiedSession {
  user: {
    id: string;
    email?: string;
    name?: string;
    role?: string | null;
    image?: string | null;
    emailVerified?: boolean | null;
  };
}

interface ProxySessionResponse {
  session: UnifiedSession | null;
  mode: 'better-auth' | 'proxy' | 'disabled';
}

interface UseUnifiedSessionResult {
  data: UnifiedSession | null;
  isPending: boolean;
  mode: 'better-auth' | 'proxy' | 'disabled';
}

/**
 * Unified session hook that works with both Better Auth and proxy authentication
 * Falls back to Better Auth session if proxy mode is not enabled
 */
export function useUnifiedSession(): UseUnifiedSessionResult {
  const { data: betterAuthSession, isPending: isBetterAuthPending } = authClient.useSession();
  const [proxySession, setProxySession] = useState<ProxySessionResponse | null>(null);
  const [isProxyPending, setIsProxyPending] = useState(true);
  const [hasCheckedProxy, setHasCheckedProxy] = useState(false);

  // Check for proxy authentication on mount
  useEffect(() => {
    if (hasCheckedProxy) return;

    async function checkProxyAuth() {
      try {
        const response = await fetch('/api/auth/session-proxy');
        const data: ProxySessionResponse = await response.json();
        setProxySession(data);
      } catch (error) {
        console.error('Failed to check proxy auth:', error);
        setProxySession({ session: null, mode: 'better-auth' });
      } finally {
        setIsProxyPending(false);
        setHasCheckedProxy(true);
      }
    }
    checkProxyAuth();
  }, [hasCheckedProxy]);

  // Determine which session to use based on auth mode
  const hasProxyResponse = proxySession !== null;
  const mode = proxySession?.mode || 'better-auth';
  const isProxyMode = mode === 'proxy';
  const isPending = !hasProxyResponse || (isProxyMode ? isProxyPending : isBetterAuthPending);
  
  let effectiveSession: UnifiedSession | null = null;
  if (isProxyMode) {
    effectiveSession = proxySession?.session || null;
  } else if (betterAuthSession?.user) {
    effectiveSession = {
      user: {
        id: betterAuthSession.user.id as string,
        email: betterAuthSession.user.email,
        name: betterAuthSession.user.name,
        role: betterAuthSession.user.role || null,
      }
    };
  }

  return {
    data: effectiveSession,
    isPending,
    mode
  };
}
