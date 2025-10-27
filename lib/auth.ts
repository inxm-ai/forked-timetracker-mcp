import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/drizzle/connection";
import { mcp } from "better-auth/plugins";
// import { Pool } from "pg";
import { getBaseUrl } from "./utils/url";
import { admin } from "better-auth/plugins";
import { sendVerificationEmail } from "./email";
import { env } from "@/lib/env";
import type { BetterAuthOptions } from "better-auth";

const baseURL = getBaseUrl();

// Email verification configuration (optional feature)
// Set ENABLE_EMAIL_VERIFICATION=true to enable email verification and require it for login
// Set ENABLE_EMAIL_VERIFICATION=false or leave unset to disable email verification
const enableEmailVerification = env.ENABLE_EMAIL_VERIFICATION;

// Configure external OAuth providers based on EXTERNAL_AUTH_MODE
function getExternalAuthProviders() {
  const mode = env.EXTERNAL_AUTH_MODE;

  // Only configure providers if mode is 'better-auth'
  if (mode !== 'better-auth') {
    return {};
  }

  const provider = env.EXTERNAL_AUTH_PROVIDER;
  const socialProviders: Record<string, { clientId: string, clientSecret: string, tenantId?: string }> = {};

  switch (provider) {
    case 'google':
      if (env.OAUTH_GOOGLE_CLIENT_ID && env.OAUTH_GOOGLE_CLIENT_SECRET) {
        socialProviders.google = {
          clientId: env.OAUTH_GOOGLE_CLIENT_ID,
          clientSecret: env.OAUTH_GOOGLE_CLIENT_SECRET,
        };
      } else {
        console.warn('Google OAuth enabled but credentials not configured');
      }
      break;

    case 'github':
      if (env.OAUTH_GITHUB_CLIENT_ID && env.OAUTH_GITHUB_CLIENT_SECRET) {
        socialProviders.github = {
          clientId: env.OAUTH_GITHUB_CLIENT_ID,
          clientSecret: env.OAUTH_GITHUB_CLIENT_SECRET,
        };
      } else {
        console.warn('GitHub OAuth enabled but credentials not configured');
      }
      break;

    case 'entra':
      if (env.OAUTH_ENTRA_CLIENT_ID && env.OAUTH_ENTRA_CLIENT_SECRET && env.OAUTH_ENTRA_TENANT_ID) {
        socialProviders.microsoftEntraId = {
          clientId: env.OAUTH_ENTRA_CLIENT_ID,
          clientSecret: env.OAUTH_ENTRA_CLIENT_SECRET,
          tenantId: env.OAUTH_ENTRA_TENANT_ID,
        };
      } else {
        console.warn('Microsoft Entra ID OAuth enabled but credentials not configured');
      }
      break;

    case 'custom':
      if (env.OAUTH_CUSTOM_AUTHORIZATION_URL &&
          env.OAUTH_CUSTOM_TOKEN_URL &&
          env.OAUTH_CUSTOM_CLIENT_ID &&
          env.OAUTH_CUSTOM_CLIENT_SECRET) {
        // For custom OIDC providers, use the generic OIDC configuration
        // This may need adjustment based on Better Auth's API
        console.warn('Custom OAuth provider configuration may need manual adjustment for Better Auth compatibility');
      } else {
        console.warn('Custom OAuth enabled but configuration incomplete');
      }
      break;

    default:
      if (provider) {
        console.warn(`Unknown OAuth provider: ${provider}`);
      }
  }

  return socialProviders;
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // or "mysql", "sqlite"
  }),
  // database: new Pool({
  // 	connectionString: process.env.DATABASE_URL,
  // }),
  plugins: [
    mcp({
      loginPage: "/login",
      oidcConfig: {
        loginPage: "/login",
        scopes: [
          "openid",
          "profile",
          "email",
          "offline_access"
        ],
        accessTokenExpiresIn: 3600,
        refreshTokenExpiresIn: 604800,
        codeExpiresIn: 600,
        requirePKCE: true, // Important for public clients
        allowDynamicClientRegistration: true,
        // defaultScope: "openid"
      }
    }),
    admin()
  ],
  baseURL,
  trustedOrigins: [
    "https://localhost:3000", // Another possible localhost URL for desktop clients [2]
    "https://localhost:6274",  // Inspector
    "https://claude.ai", // The base domain of Claude.ai
    "https://www.claude.ai", // www variant
    "https://app.claude.ai", // app subdomain
    "https://api.claude.ai", // API subdomain
    // If you are deploying on Vercel and using preview deployments:
    baseURL,
  ],
  secret: env.AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    disableSignUp: false, // If true, disables sign-up for new users entirely. Only existing users can sign in.
    // Email verification is optional and controlled by ENABLE_EMAIL_VERIFICATION
    // To enable email verification, set ENABLE_EMAIL_VERIFICATION=true
    // To disable email verification, set ENABLE_EMAIL_VERIFICATION=false or leave unset
    requireEmailVerification: enableEmailVerification
  },
  // Add external OAuth providers if configured
  socialProviders: getExternalAuthProviders(),
  // Email verification configuration (optional feature)
  // This block is only included if email verification is enabled
  // To enable: set ENABLE_EMAIL_VERIFICATION=true and configure email service
  // To disable: set ENABLE_EMAIL_VERIFICATION=false or leave unset
  ...(enableEmailVerification && {
    emailVerification: {
      sendVerificationEmail: async (data) => {
        await sendVerificationEmail(data);
      },
    },
  }),
});
