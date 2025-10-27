import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    // Database
    DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection string"),
    
    // Authentication
    AUTH_SECRET: z
      .string()
      .min(32, "AUTH_SECRET must be at least 32 characters long")
      .optional()
      .default("your-secret-key-at-least-32-characters-long"),
    
    // External Authentication Configuration
    EXTERNAL_AUTH_MODE: z
      .enum(["better-auth", "proxy", "disabled"])
      .optional()
      .default("disabled")
      .describe("External authentication mode: better-auth (OAuth via Better Auth), proxy (OAuth proxy with signed headers), or disabled"),

    EXTERNAL_AUTH_PROVIDER: z
      .enum(["google", "github", "entra", "custom"])
      .optional()
      .describe("External OAuth provider when using better-auth mode"),

    // OAuth Provider Configuration (for better-auth mode)
    OAUTH_GOOGLE_CLIENT_ID: z.string().optional(),
    OAUTH_GOOGLE_CLIENT_SECRET: z.string().optional(),
    OAUTH_GITHUB_CLIENT_ID: z.string().optional(),
    OAUTH_GITHUB_CLIENT_SECRET: z.string().optional(),
    OAUTH_ENTRA_CLIENT_ID: z.string().optional(),
    OAUTH_ENTRA_CLIENT_SECRET: z.string().optional(),
    OAUTH_ENTRA_TENANT_ID: z.string().optional(),
    OAUTH_CUSTOM_AUTHORIZATION_URL: z.string().url().optional(),
    OAUTH_CUSTOM_TOKEN_URL: z.string().url().optional(),
    OAUTH_CUSTOM_USERINFO_URL: z.string().url().optional(),
    OAUTH_CUSTOM_CLIENT_ID: z.string().optional(),
    OAUTH_CUSTOM_CLIENT_SECRET: z.string().optional(),

    // OAuth Proxy Configuration (for proxy mode)
    PROXY_USER_HEADER: z
      .string()
      .optional()
      .default("x-auth-request-user")
      .describe("Header containing authenticated user info from proxy"),

    PROXY_EMAIL_HEADER: z
      .string()
      .optional()
      .default("x-auth-request-email")
      .describe("Header containing user email from proxy"),

    PROXY_JWT_HEADER: z
      .string()
      .optional()
      .default("x-auth-request-jwt")
      .describe("Header containing signed JWT from proxy"),

    PROXY_JWT_JWKS_URL: z
      .string()
      .url()
      .optional()
      .describe("JWKS URL to verify JWT signatures from proxy"),

    PROXY_JWT_PUBLIC_KEY: z
      .string()
      .optional()
      .describe("Public key (PEM format) to verify JWT signatures from proxy"),

    PROXY_JWT_ISSUER: z
      .string()
      .optional()
      .describe("Expected JWT issuer claim for validation"),

    PROXY_JWT_AUDIENCE: z
      .string()
      .optional()
      .describe("Expected JWT audience claim for validation"),

    // External Auth Policies
    EXTERNAL_CREATE_LOCAL_USER: z
      .enum(["true", "false"])
      .optional()
      .default("true")
      .transform((val) => val === "true")
      .describe("Automatically create local user on first external login"),

    EXTERNAL_LINKING_POLICY: z
      .enum(["auto", "require-manual-link"])
      .optional()
      .default("auto")
      .describe("Policy for linking external accounts: auto (by email) or require-manual-link"),

    // Email Service (Optional)
    LOOPS_API_KEY: z
      .string()
      .optional()
      .describe("Loops.js API key for email verification and transactional emails"),
    
    LOOPS_EMAIL_VERIFICATION_TEMPLATE_ID: z
      .string()
      .optional()
      .default("cmd7ideu22tzlzg0jlw2hb99b")
      .describe("Custom email verification template ID for Loops.js"),
    
    // Email Verification Feature Toggle
    ENABLE_EMAIL_VERIFICATION: z
      .enum(["true", "false"])
      .optional()
      .default("false")
      .transform((val) => val === "true")
      .describe("Enable email verification for new user registrations"),
    
    // Redis (Optional)
    REDIS_URL: z
      .string()
      .url("REDIS_URL must be a valid Redis connection string")
      .optional()
      .describe("Redis connection string for MCP adapter session management"),
    
    // Development/Testing
    SEED_USER_ID: z
      .string()
      .optional()
      .default("test-user-123")
      .describe("User ID for database seeding in development"),
    
    // Vercel Environment Variables (automatically set by Vercel)
    VERCEL_PROJECT_PRODUCTION_URL: z
      .string()
      .optional()
      .describe("Production URL of the Vercel project"),
    
    VERCEL_BRANCH_URL: z
      .string()
      .optional()
      .describe("Branch/preview deployment URL"),
    
    VERCEL_URL: z
      .string()
      .optional()
      .describe("Default Vercel deployment URL"),
    
    // Runtime Environment
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .optional()
      .default("development"),
    
    // Base URL fallback
    BASE_URL: z
      .string()
      .url("BASE_URL must be a valid URL")
      .optional()
      .default("http://localhost:3000")
      .describe("Base URL fallback for development"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // Custom domain override (client-side accessible)
    NEXT_PUBLIC_APP_URL: z
      .string()
      .url("NEXT_PUBLIC_APP_URL must be a valid URL")
      .optional()
      .describe("Custom domain URL that takes precedence over Vercel URLs"),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    // Server-side
    DATABASE_URL: process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,

    // External Auth
    EXTERNAL_AUTH_MODE: process.env.EXTERNAL_AUTH_MODE,
    EXTERNAL_AUTH_PROVIDER: process.env.EXTERNAL_AUTH_PROVIDER,

    // OAuth Providers
    OAUTH_GOOGLE_CLIENT_ID: process.env.OAUTH_GOOGLE_CLIENT_ID,
    OAUTH_GOOGLE_CLIENT_SECRET: process.env.OAUTH_GOOGLE_CLIENT_SECRET,
    OAUTH_GITHUB_CLIENT_ID: process.env.OAUTH_GITHUB_CLIENT_ID,
    OAUTH_GITHUB_CLIENT_SECRET: process.env.OAUTH_GITHUB_CLIENT_SECRET,
    OAUTH_ENTRA_CLIENT_ID: process.env.OAUTH_ENTRA_CLIENT_ID,
    OAUTH_ENTRA_CLIENT_SECRET: process.env.OAUTH_ENTRA_CLIENT_SECRET,
    OAUTH_ENTRA_TENANT_ID: process.env.OAUTH_ENTRA_TENANT_ID,
    OAUTH_CUSTOM_AUTHORIZATION_URL: process.env.OAUTH_CUSTOM_AUTHORIZATION_URL,
    OAUTH_CUSTOM_TOKEN_URL: process.env.OAUTH_CUSTOM_TOKEN_URL,
    OAUTH_CUSTOM_USERINFO_URL: process.env.OAUTH_CUSTOM_USERINFO_URL,
    OAUTH_CUSTOM_CLIENT_ID: process.env.OAUTH_CUSTOM_CLIENT_ID,
    OAUTH_CUSTOM_CLIENT_SECRET: process.env.OAUTH_CUSTOM_CLIENT_SECRET,

    // Proxy Headers
    PROXY_USER_HEADER: process.env.PROXY_USER_HEADER,
    PROXY_EMAIL_HEADER: process.env.PROXY_EMAIL_HEADER,
    PROXY_JWT_HEADER: process.env.PROXY_JWT_HEADER,
    PROXY_JWT_JWKS_URL: process.env.PROXY_JWT_JWKS_URL,
    PROXY_JWT_PUBLIC_KEY: process.env.PROXY_JWT_PUBLIC_KEY,
    PROXY_JWT_ISSUER: process.env.PROXY_JWT_ISSUER,
    PROXY_JWT_AUDIENCE: process.env.PROXY_JWT_AUDIENCE,

    // External Auth Policies
    EXTERNAL_CREATE_LOCAL_USER: process.env.EXTERNAL_CREATE_LOCAL_USER,
    EXTERNAL_LINKING_POLICY: process.env.EXTERNAL_LINKING_POLICY,

    LOOPS_API_KEY: process.env.LOOPS_API_KEY,
    LOOPS_EMAIL_VERIFICATION_TEMPLATE_ID: process.env.LOOPS_EMAIL_VERIFICATION_TEMPLATE_ID,
    ENABLE_EMAIL_VERIFICATION: process.env.ENABLE_EMAIL_VERIFICATION,
    REDIS_URL: process.env.REDIS_URL,
    SEED_USER_ID: process.env.SEED_USER_ID,
    VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
    VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    NODE_ENV: process.env.NODE_ENV,
    BASE_URL: process.env.BASE_URL,
    
    // Client-side
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=""` will throw an error.
   */
  emptyStringAsUndefined: true,
});