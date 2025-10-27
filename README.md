# TimeTracker MCP

[![MIT License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

A **conversational-first time tracking platform** built on the **Model Context Protocol (MCP)** that demonstrates next-generation software architecture. TimeTracker MCP prioritizes natural language interaction over traditional UI patterns, enabling complete functionality through conversational commands while providing optional web-based visualization.

---

## Table of Contents
1. [Features](#features)
2. [Why TimeTracker MCP?](#why-timetracker-mcp)
3. [Quick Start](#quick-start)
4. [Configuration](#configuration)
5. [Optional Features](#optional-features)
6. [One-Click Vercel Deploy](#one-click-vercel-deploy)
7. [How Does It Work? (Tech Stack)](#how-does-it-work-tech-stack)
8. [Why is all this goodness free?](#why-is-all-this-goodness-free)
9. [Roadmap](#roadmap)
10. [Contributing](#contributing)
11. [License](#license)

---

## Features
- **Conversational Interface** — control every aspect of time tracking through chat-style commands.
- **Collaborative Client & Project Management** — shared workspace where any team member can create, modify, and manage clients and projects.
- **Start / Stop / Pause** timers; automatic overlap checks.
- **Rich Reporting** — daily, weekly and custom summaries.
- **Multi-User with Shared Resources** — individual time tracking with shared clients and projects for seamless team collaboration.
- **Data Integrity Protection** — clients and projects with tracked time cannot be deactivated, preserving historical data.
- **Patched Authentication** — uses [Better Auth](https://github.com/better-auth/better-auth) with our patch ([PR #3091](https://github.com/better-auth/better-auth/pull/3091)) adding enhanced PKCE support described in `docs/better-auth-patch.md`.
- **External OAuth Support** — integrate Google, GitHub, Microsoft Entra ID, or custom OAuth/OIDC providers; supports OAuth proxy mode for enterprise deployments. See [External Auth Guide](docs/EXTERNAL_AUTH.md).
- **Open User Registration** — by default, anyone can create an account through the signup page at `/app/signup`.
- **Optional Email Verification** — secure user registration with email verification via [Loops.js](https://loops.so) (optional feature).
- **Dark/Light Theme** — implemented with `next-themes` & CSS variables.

## Architecture Philosophy

TimeTracker MCP implements a **conversational-first architecture** that fundamentally reimagines software interaction patterns. Instead of adapting users to interface constraints, the system adapts to natural language expression.

### Key Architectural Principles

1. **Conversational Primary Interface**: All core functionality is accessible through natural language commands via MCP protocol
2. **Context Preservation**: Conversational state maintains workflow continuity across interactions
3. **Extensible Intent System**: New capabilities can be added through MCP tools without UI redesign
4. **Collaborative Resource Model**: Shared clients and projects with individual privacy controls
5. **UI as Visualization Layer**: Web interface serves as optional dashboard for data visualization and quick operations

### MCP Protocol Implementation

TimeTracker MCP implements a comprehensive set of MCP tools that provide complete system functionality through conversational interface:

#### Core MCP Tools

**Client Management Operations:**
```typescript
create_client, list_clients, update_client, deactivate_client
```

**Project Management Operations:**
```typescript
create_project, list_projects, update_project, deactivate_project
```

**Time Tracking Operations:**
```typescript
start_time_tracking, stop_time_tracking, add_manual_time_entry, get_active_time_entry
```

**Reporting and Analytics:**
```typescript
list_time_entries, get_time_summary, calculate_earnings
```

#### Interface Hierarchy

1. **Primary Interface (MCP Protocol)**: Complete functionality accessible through natural language commands in any MCP-compatible client
2. **Secondary Interface (Web Dashboard)**: Optional visualization layer for data consultation, basic timer operations, and report generation

This architecture ensures that all business logic remains accessible through conversational interaction while providing traditional UI elements for users who prefer visual interfaces.

### Data Model and Collaboration Architecture

TimeTracker MCP implements a **hybrid collaboration model** that balances team resource sharing with individual privacy:

#### Resource Sharing Strategy

**Shared Resources (Organization-Wide Access):**
- **Clients**: All authenticated users can create, view, modify, and deactivate client records
- **Projects**: Project management is accessible to all team members across the organization
- **Collaborative Ownership**: Resources are team-owned rather than user-owned to eliminate duplication

**Private Resources (Individual Access):**
- **Time Entries**: Each user's time tracking data remains completely private
- **Personal Reports**: Users can only access their own productivity metrics and earnings calculations

#### Data Integrity and Audit Controls

- **Referential Integrity**: Clients and projects with associated time entries cannot be deactivated
- **Audit Trail**: All resource creation is tracked via `userId` field for accountability
- **Historical Preservation**: System prevents accidental deletion of time tracking context

This architecture eliminates resource duplication while maintaining appropriate privacy boundaries and data integrity.

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- PostgreSQL database (local or cloud)
- Redis instance (optional, recommended for production)

### Setup Steps
```bash
# Clone repository
git clone https://github.com/lumile/timetracker-mcp.git
cd timetracker-mcp

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local
# 🔑 Fill in the required variables (see Configuration section)
# Generate AUTH_SECRET using: openssl rand -base64 32
# Or visit: https://www.better-auth.com/docs/installation#set-environment-variables

# Generate Better Auth schema (if needed)
npx @better-auth/cli generate --output drizzle/better-auth-schema.ts
# When prompted to overwrite existing schema, answer "yes"

# Generate database migrations
pnpm db:generate
# Creates new Drizzle migration files based on schema changes

# Run database migrations
pnpm db:migrate
# Applies all pending migrations to your database

# Optional: Load sample data for testing
pnpm db:seed
# Creates sample clients, projects, and time entries for development

# For development: Start PostgreSQL container using Docker
./start-postgres.sh
# This will start a PostgreSQL container with the timetracker-mcp database
# The script will display the DATABASE_URL to add to your .env file

# Start development server
pnpm dev
```
Open `http://localhost:3000` and start tracking time through conversation.

### Understanding the Collaboration Model
Once running, any authenticated user can:
- View all available clients and projects with `list_clients` and `list_projects`  
- Create new clients/projects that become available to the entire team
- Modify existing clients/projects created by any team member
- Track time against any project (time entries remain private to each user)
- Generate personal reports and earnings calculations

Clients/projects can only be deactivated if they have no associated time entries, protecting historical data integrity.

### MCP vs Dashboard Usage
**For full productivity, use MCP tools in your conversational client (like Claude):**
- All operations available through natural language
- Context-aware conversations remember your workflow
- No form-filling or clicking required

**The web dashboard provides:**
- Quick visual overview of your current status
- Charts and visual reports
- Basic timer controls (start/stop)
- Emergency access when MCP client unavailable

**Recommended workflow:** Use MCP for daily operations, dashboard for occasional visual reviews.

## Configuration

### Required Environment Variables
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon works great) |
| `BETTER_AUTH_SECRET` | Secret issued by Better Auth |

### User Registration

By default, TimeTracker MCP allows open registration for new users through the signup page at `/app/signup`. This means anyone can create an account and start using the application.

```typescript
emailAndPassword: {
  disableSignUp: true, // Change this to true to disable sign-up for new users
},
```

By default, email verification is disabled (`ENABLE_EMAIL_VERIFICATION=false` in `.env` file and `requireEmailVerification: enableEmailVerification` is set to false in `lib/auth.ts`). If you want to enable email verification, you need to:

1. Set `ENABLE_EMAIL_VERIFICATION=true` in your `.env` file
2. Configure the Loops.js email service by setting the following variables in your `.env` file:
   ```
   LOOPS_API_KEY=your_loops_api_key_here
   LOOPS_EMAIL_VERIFICATION_TEMPLATE_ID=your_template_id_here
   ```

For more details on authentication configuration options, refer to the [Better Auth documentation](https://www.better-auth.com/docs/reference/options).

### External OAuth Authentication

TimeTracker MCP supports external OAuth/OIDC authentication providers through two modes:

1. **Better Auth Integration** — OAuth providers (Google, GitHub, Microsoft Entra ID, custom OIDC) integrated directly
2. **OAuth Proxy Mode** — Use an external OAuth proxy with signed JWT headers for enterprise deployments
3. **Disabled** — Default mode with email/password only

For complete configuration instructions, see **[External Authentication Guide](docs/EXTERNAL_AUTH.md)**.

Quick configuration:
```bash
# Enable external auth
EXTERNAL_AUTH_MODE=better-auth  # or "proxy" or "disabled"

# For Better Auth mode - configure OAuth provider
EXTERNAL_AUTH_PROVIDER=google
OAUTH_GOOGLE_CLIENT_ID=your-client-id
OAUTH_GOOGLE_CLIENT_SECRET=your-client-secret
```

### Optional Environment Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_URL` | Redis instance URL (recommended for production) | Not set |
| `ENABLE_EMAIL_VERIFICATION` | Enable email verification for new users | `false` |
| `LOOPS_API_KEY` | Loops.js API key (required if email verification is enabled) | Not set |
| `LOOPS_EMAIL_VERIFICATION_TEMPLATE_ID` | Custom email template ID for verification emails | Uses default template |

### MCP API Key (non-OAuth access)

You can optionally expose the MCP tools to trusted clients using a static API key instead of the OAuth flow. This is useful for server-to-server integrations or when you control the client environment and cannot perform OAuth.

Environment variables:

- `MCP_API_KEY` — the secret token that your client will send.
- `MCP_API_USER_ID` — (optional) local user id to associate requests authenticated with `MCP_API_KEY`. If not provided the server falls back to `SEED_USER_ID` or a generic `service-user` id.

How to send the key:

- Header: `x-api-key: <your-key>`
- Or: `Authorization: Bearer <your-key>`

Security notes:

- Treat `MCP_API_KEY` like any other secret. Do not commit it to repos or expose it in client-side code.
- For production consider rotating keys, using per-client keys, IP allowlists, short-lived tokens, or DB-backed API keys with create/delete endpoints.


> **Note**  You can create a free Postgres database on [Neon](https://neon.tech) and a free Redis database on [Upstash](https://upstash.com).  Redis is optional, but recommended for production use.

## Optional Features

### Email Verification with Loops.js

TimeTracker MCP includes optional email verification for new user registrations. This feature is disabled by default to keep the setup simple, but you can enable it for enhanced security.

#### Why Email Verification?
- **Enhanced Security**: Ensures users have access to their registered email
- **Reduced Spam**: Prevents registration with fake email addresses
- **Better User Experience**: Users receive professional verification emails

#### Setting up Email Verification

1. **Create a Loops.js Account**
   - Sign up at [loops.so](https://loops.so)
   - Get your API key from the dashboard

2. **Configure Email Template**
   - Create a new transactional email template in Loops.js
   - Use these variables in your template:
     - `{url}` - The verification link
     - `{homeurl}` - Your application's base URL
   - Note the template ID for configuration

3. **Configure Environment Variables**
   ```bash
   # Enable email verification
   ENABLE_EMAIL_VERIFICATION=true
   
   # Add your Loops.js API key
   LOOPS_API_KEY=your_loops_api_key_here
   
   # Optional: Use your custom template ID
   LOOPS_EMAIL_VERIFICATION_TEMPLATE_ID=your_template_id_here
   ```

4. **Restart your application** - Email verification is now enabled!

#### How it Works
- When `ENABLE_EMAIL_VERIFICATION=true`, new users must verify their email before signing in
- Users receive a verification email via Loops.js with a secure verification link
- Unverified users see a clear message when attempting to sign in
- The feature is completely optional and can be disabled anytime

#### Using Alternative Email Services
This implementation uses Loops.js, but you can easily integrate other email services:
- Replace the implementation in `lib/email.ts`
- Keep the same interface for seamless integration
- Examples: SendGrid, Mailgun, AWS SES, etc.

## One-Click Vercel Deploy
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flumile%2Ftimetracker-mcp&env=BETTER_AUTH_SECRET,REDIS_URL,DATABASE_URL)

1. Click the button above.
2. Populate the same env vars shown in the table.
3. Hit **Deploy**. Vercel will build the Next.js project and expose your MCP server.

## How Does It Work? (Tech Stack)
- **Next.js 15** App Router & TypeScript
- **shadcn/ui** for primitive components
- **PostgreSQL** + **Drizzle ORM**
- **Redis (Optional)** for session & conversation cache
- **Better Auth** (patched) for OIDC & PKCE flows
- **Vercel MCP Adapter** for MCP server creation
- **Loops.js (Optional)** for transactional email verification
- **pnpm** monorepo tooling

## Why is this free?
TimeTracker MCP is developed and maintained by **[Lumile](https://www.lumile.com.ar)** to experiment with cutting-edge technologies such as MCPs in real-world scenarios. By sharing the code we:
- Give back to the community that empowers our daily work.
- Gather feedback that makes the product better for everyone.
- Demonstrate how conversational apps can replace SaaS in small businesses.

If TimeTracker MCP saves you time, consider starring ⭐ the repo or sharing it with friends!

## Roadmap
- [ ] TBD

## Contributing
Pull Requests are welcome! Please open an issue first to discuss major changes. Make sure tests pass and follow the existing coding style.

## License
This project is licensed under the **MIT License** — see the [`LICENSE`](LICENSE) file for details.

---
Made with ❤️ by [Lumile](https://www.lumile.com.ar)