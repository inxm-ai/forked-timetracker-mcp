# External Authentication - Quick Reference

## TL;DR

Add external OAuth (Google, GitHub, Microsoft, etc.) to TimeTracker MCP with 3 environment variables:

```bash
EXTERNAL_AUTH_MODE=better-auth
EXTERNAL_AUTH_PROVIDER=google
OAUTH_GOOGLE_CLIENT_ID=your-id
OAUTH_GOOGLE_CLIENT_SECRET=your-secret
```

Then run migration: `pnpm db:migrate`

## Modes at a Glance

| Mode | Use Case | Complexity |
|------|----------|------------|
| **disabled** (default) | Email/password only |  Simple |
| **better-auth** | Direct OAuth integration |  Medium |
| **proxy** | Enterprise OAuth proxy | Enterprise |

## 3-Minute Setup: Google OAuth

### 1. Google Cloud Console
- Go to: https://console.cloud.google.com/apis/credentials
- Create OAuth 2.0 Client ID
- Add redirect: `https://your-domain.com/api/auth/callback/google`

### 2. Environment Variables
```bash
EXTERNAL_AUTH_MODE=better-auth
EXTERNAL_AUTH_PROVIDER=google
OAUTH_GOOGLE_CLIENT_ID=123456.apps.googleusercontent.com
OAUTH_GOOGLE_CLIENT_SECRET=GOCSPX-xxx
```

### 3. Run Migration
```bash
pnpm db:migrate
pnpm dev
```

Done! Users can now sign in with Google.

## Quick Provider Setup

### GitHub
```bash
EXTERNAL_AUTH_PROVIDER=github
OAUTH_GITHUB_CLIENT_ID=Iv1.xxx
OAUTH_GITHUB_CLIENT_SECRET=xxx
```
Create at: https://github.com/settings/developers

### Microsoft Entra ID
```bash
EXTERNAL_AUTH_PROVIDER=entra
OAUTH_ENTRA_CLIENT_ID=xxx
OAUTH_ENTRA_CLIENT_SECRET=xxx
OAUTH_ENTRA_TENANT_ID=xxx
```
Create at: https://portal.azure.com/ -> Azure AD -> App registrations

## Common Patterns

### Pattern: Auto-create users (recommended)
```bash
EXTERNAL_AUTH_MODE=better-auth
EXTERNAL_AUTH_PROVIDER=google
EXTERNAL_CREATE_LOCAL_USER=true
EXTERNAL_LINKING_POLICY=auto
```
Users sign in with Google -> Account created automatically

### Pattern: Controlled access
```bash
EXTERNAL_AUTH_MODE=better-auth
EXTERNAL_AUTH_PROVIDER=github
EXTERNAL_CREATE_LOCAL_USER=false
EXTERNAL_LINKING_POLICY=require-manual-link
```
Users must exist first -> Then link GitHub manually

### Pattern: Enterprise proxy
```bash
EXTERNAL_AUTH_MODE=proxy
PROXY_JWT_JWKS_URL=https://proxy.company.com/.well-known/jwks.json
PROXY_JWT_ISSUER=https://proxy.company.com
```
OAuth proxy handles auth -> App verifies JWT -> User created

## API Quick Reference

### Check linked accounts
```bash
curl -H "Cookie: session=..." \
  https://your-app.com/api/auth/external/link
```

### Link external account
```bash
curl -X POST \
  -H "Cookie: session=..." \
  -H "Content-Type: application/json" \
  -d '{"provider":"google","externalId":"123","externalEmail":"user@gmail.com"}' \
  https://your-app.com/api/auth/external/link
```

### Unlink account
```bash
curl -X DELETE \
  -H "Cookie: session=..." \
  https://your-app.com/api/auth/external/link
```

## UI Component

Add to profile page:
```tsx
import { ExternalAccountLinking } from '@/components/auth/ExternalAccountLinking';

export default function ProfilePage() {
  return (
    <div>
      <ExternalAccountLinking />
    </div>
  );
}
```

## Common Issues

### "OAuth callback failed"
- Check redirect URI matches exactly
- Verify client ID/secret are correct
- Check BASE_URL environment variable

### "JWT verification failed"
- Set PROXY_JWT_JWKS_URL or PROXY_JWT_PUBLIC_KEY
- Check JWT issuer/audience match
- Verify JWT hasn't expired

### "User not created"
- Set EXTERNAL_CREATE_LOCAL_USER=true
- Check database migration ran
- Review application logs

## Rollback Plan

To disable external auth:
```bash
# Set in .env
EXTERNAL_AUTH_MODE=disabled
```

Restart app. All external auth disabled, email/password works as before.

Database columns remain (can be dropped later if needed).
