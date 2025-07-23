# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js application demonstrating Better Auth integration with MCP (Model Context Protocol) authentication. The project enables OAuth-based authentication for MCP clients (like Claude Code) to securely access server-side tools.

## Key Architecture

### Authentication Flow
- **Better Auth**: Primary authentication system with MCP plugin support
- **OAuth 2.0**: Implements OAuth authorization server with custom `claudeai` scope
- **Database**: PostgreSQL for production, with Better Auth schema migrations
- **MCP Integration**: Uses `@vercel/mcp-adapter` to expose authenticated tools via MCP protocol

### Core Components
- `lib/auth.ts`: Better Auth configuration with MCP plugin and OAuth settings
- `app/api/auth/[...all]/route.ts`: Better Auth handlers for OAuth flows
- `app/api/[transport]/route.ts`: MCP tool endpoints with authentication middleware
- `app/.well-known/`: OAuth discovery endpoints for server metadata
- `lib/utils/url.ts`: Base URL resolution prioritizing custom domains over Vercel URLs

### MCP Tool Structure
Tools are defined in the `[transport]` route using `withMcpAuth` wrapper that validates OAuth access tokens before exposing functionality. The application now includes comprehensive time tracking tools:

**Available MCP Tools:**
- **Client Management**: create_client, list_clients, update_client, deactivate_client
- **Project Management**: create_project, list_projects, update_project, deactivate_project  
- **Time Tracking**: start_time_tracking, stop_time_tracking, get_active_time_entry, add_manual_time_entry, update_time_entry
- **Reporting**: list_time_entries, get_time_summary, calculate_earnings

See `docs/mcp-tools-guide.md` for detailed usage instructions.

## Development Commands

```bash
# Development server with Turbopack
pnpm dev

# Build (includes migration run)
pnpm build

# Run migrations manually
npx @better-auth/cli migrate

# Drizzle database commands
pnpm db:setup     # Initial setup (Better Auth + Drizzle migrations)
pnpm db:generate  # Generate new migrations
pnpm db:migrate   # Run Drizzle migrations (RECOMMENDED)
pnpm db:push      # ⚠️  WARNING: Can conflict with Better Auth tables
pnpm db:studio    # Open Drizzle Studio

# Development data seeding
pnpm db:seed           # Seed database with sample data for development
pnpm test:reports-api  # Test reports API directly (bypasses auth)

# Testing commands
pnpm test              # Run all tests
pnpm test:watch        # Run tests in watch mode
pnpm test:coverage     # Generate coverage report
pnpm test:api          # Run API tests only
pnpm test:components   # Run component tests only
pnpm test:mcp          # Run MCP tools tests only
pnpm test:services     # Run service layer tests only

# Lint code
pnpm lint

# Test MCP connection with inspector
pnpm inspector
```

## Database Setup

The application uses a dual-database approach:
- **Better Auth**: Handles user authentication tables via SQL migrations
- **Drizzle ORM**: Manages time tracking tables (clients, projects, time_entries)

**IMPORTANT**: Use migrations, not `db:push`, to avoid conflicts between Better Auth and Drizzle.

**Automatic Migrations**: Both Better Auth and Drizzle migrations run automatically during `pnpm build` via `scripts/run-migrations.js`. This ensures deployments on Vercel always have the latest schema.

For manual migration:
```bash
# Initial setup (recommended for new environments)
pnpm db:setup

# Individual migrations
npx @better-auth/cli migrate  # Better Auth first
pnpm db:migrate              # Then Drizzle

# Development workflow
pnpm db:generate  # Generate new Drizzle migrations
pnpm db:migrate   # Apply Drizzle migrations
```

## Testing Setup

The project has comprehensive test coverage using **Jest** and **React Testing Library**:

### Test Structure
- **`__tests__/api/`** - API route tests (Next.js endpoints)
- **`__tests__/mcp-tools/`** - MCP tools tests (time tracking, clients, projects)
- **`__tests__/services/`** - Service layer tests (business logic)
- **`__tests__/components/`** - UI component tests (React components)
- **`__tests__/utils/`** - Test utilities and helpers
- **`__tests__/mocks/`** - Mock data and API responses

### Key Testing Features
- **Database Mocking**: All database operations are mocked for isolation
- **API Mocking**: HTTP requests are mocked using MSW patterns
- **Component Testing**: User interactions and state changes
- **Authentication Testing**: Better Auth sessions and user authorization
- **Error Handling**: Comprehensive error scenario testing

### Test Coverage
The test suite covers:
- ✅ API endpoints with authentication and validation
- ✅ MCP tools with success/error scenarios
- ✅ Service layer business logic
- ✅ UI components with user interactions
- ✅ Time tracking workflows
- ✅ Data filtering and pagination
- ✅ Export functionality

See `TESTING.md` for detailed testing guide and best practices.

## Development Data Seeding

For testing dashboard and reports functionality, you can seed the database with sample data:

### Quick Start (Recommended)
```bash
# Ensure your .env.local file has DATABASE_URL set
# Run the seed script with default test user
pnpm db:seed

# Test the reports API directly
pnpm test:reports-api
```

### What the seed script creates:
- **3 sample clients**: Acme Corporation, StartupXYZ, LocalBusiness
- **5 sample projects**: E-commerce Platform, Mobile App, Website Redesign, SEO Optimization, Business Consultation
- **30 days of realistic time entries**: Various durations, weekdays only, realistic work patterns
- **1 active time entry**: Current work session for testing

### Testing the Implementation
```bash
# 1. Seed the database
pnpm db:seed

# 2. Test APIs directly (bypasses auth)
pnpm test:reports-api

# 3. Start the dev server
pnpm dev

# 4. View reports at http://localhost:3000/reports
```

**Notes**: 
- The seed script uses `test-user-123` as the default user ID. For production testing, you'll need to either:
  1. Create a user with this ID in the auth system, or
  2. Use `SEED_USER_ID=your-real-user-id` when running the seed script
- **Environment Variables**: Scripts automatically load from `.env.local` first, then `.env`
- **Database Connection**: Ensure your `DATABASE_URL` is properly set in your environment file

## Environment Variables Required

- `DATABASE_URL`: PostgreSQL connection string
- `AUTH_SECRET`: At least 32-character secret key
- `NEXT_PUBLIC_APP_URL`: (Optional) Custom domain override
- `REDIS_URL`: (Optional) For MCP adapter session management

## CORS Configuration

The application has extensive CORS setup in `next.config.ts` and individual route handlers to support MCP client connections from various origins including localhost and claude.ai domains.

## Better Auth Integration

### Authentication Architecture
This project uses **@pekastel/better-auth**, a custom branch of Better Auth with enhanced features:

- **Custom Branch**: Uses `@pekastel/better-auth` which includes enhanced PKCE support (PR #3091)
- **MCP Plugin**: Integrated MCP (Model Context Protocol) plugin for OAuth-based authentication
- **Admin Plugin**: Includes Better Auth admin plugin for user management and profile editing
- **OAuth 2.0**: Implements full OAuth authorization server with custom `claudeai` scope

### Better Auth Configuration
Key files and setup:
- `lib/auth.ts`: Main Better Auth configuration with MCP and admin plugins
- `app/api/auth/[...all]/route.ts`: Better Auth route handlers for all auth flows
- `lib/authClient.ts`: Client-side auth utilities and session management

### User Management Features
- **Profile Management**: Users can edit their profile through `/profile` page
- **Password Changes**: Secure password updates via `/profile/settings` page  
- **Admin Integration**: Uses Better Auth admin plugin for user CRUD operations
- **Session Management**: Automatic session handling with SWR integration

### Authentication Flow
1. **OAuth Login**: Users authenticate via OAuth 2.0 flow
2. **Session Creation**: Better Auth creates secure sessions with JWT tokens
3. **Client Access**: MCP clients can access tools using OAuth access tokens
4. **Profile Management**: Users can modify their data through admin plugin endpoints

### API Endpoints for Profile Management
- `POST /api/auth/admin/update-user`: Update user profile (name, email, password)
- `GET /api/auth/session`: Get current user session
- `POST /api/auth/sign-out`: Sign out and invalidate session

## Development Guidelines

### Client-Side Architecture
- **No SSR (Server-Side Rendering)**: This project uses client-side rendering exclusively with `'use client'` directive
- **State Management**: Uses SWR for data fetching and React state for UI state
- **Event-Driven Communication**: Components communicate via custom events (e.g., `timerStopped` event from ActiveTimer to EnhancedTimeEntriesList)
- **Authentication Guards**: All protected pages check authentication status and redirect as needed

### Component Organization Pattern
- **Client Components**: Large client components that represent full pages should be placed in the `components/` directory, not in the `app/` directory
- **Page Components**: App router pages should be minimal and simply import and render the corresponding client component from `components/`
- **Example**: `app/reports/page.tsx` imports and renders `components/ReportsClient.tsx`
- **Directory Structure**: 
  - `components/` - Contains all reusable components and full-page client components
  - `app/` - Contains only Next.js App Router pages that import components
  - This pattern keeps the app directory clean and makes components more reusable