# Testing Guide

This document describes the testing setup and conventions for the timetracker-mcp project.

## Overview

The project uses **Jest** with **React Testing Library** for comprehensive testing across all layers:

- **API Route Tests** - Test Next.js API endpoints
- **MCP Tools Tests** - Test Model Context Protocol tools
- **Service Layer Tests** - Test business logic and database interactions
- **UI Component Tests** - Test React components and user interactions

## Test Structure

```
__tests__/
├── api/                     # API route tests
│   ├── time-entries.test.ts
│   ├── projects.test.ts
│   └── time-entries-active.test.ts
├── mcp-tools/               # MCP tools tests
│   ├── time-tracking-tools.test.ts
│   ├── client-tools.test.ts
│   └── project-tools.test.ts
├── services/                # Service layer tests
│   └── time-entries.test.ts
├── components/              # UI component tests
│   ├── ActiveTimer.test.tsx
│   └── EnhancedTimeEntriesList.test.tsx
├── utils/                   # Test utilities
│   └── test-helpers.ts
└── mocks/                   # Mock data
    └── mock-data.ts
```

## Configuration Files

- `jest.config.js` - Jest configuration with Next.js integration
- `jest.setup.js` - Global test setup and mocks
- `__tests__/utils/test-helpers.ts` - Test utility functions
- `__tests__/mocks/mock-data.ts` - Mock data for tests

## Running Tests

### All Tests
```bash
pnpm test
```

### Watch Mode (for development)
```bash
pnpm test:watch
```

### Coverage Report
```bash
pnpm test:coverage
```

### Specific Test Categories
```bash
# API tests only
pnpm test:api

# Component tests only
pnpm test:components

# MCP tools tests only
pnpm test:mcp

# Service layer tests only
pnpm test:services
```

## Test Categories

### 1. API Route Tests (`__tests__/api/`)

Tests Next.js API routes with mocked database interactions.

**Example:**
```typescript
import { GET, POST } from '@/app/api/time-entries/route'
import { createMockRequest } from '../utils/test-helpers'

describe('/api/time-entries', () => {
  it('should return time entries with pagination', async () => {
    const request = createMockRequest('GET', '/api/time-entries?page=1&limit=10')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })
})
```

**Key Testing Areas:**
- Authentication validation
- Request/response handling
- Database query logic
- Error handling
- Pagination and filtering

### 2. MCP Tools Tests (`__tests__/mcp-tools/`)

Tests Model Context Protocol tools with mocked service dependencies.

**Example:**
```typescript
import { startTimeTrackingTool } from '@/lib/mcp-tools/time-tracking-tools'

describe('startTimeTrackingTool', () => {
  it('should start time tracking successfully', async () => {
    const result = await startTimeTrackingTool.handler(
      { projectId: 'test-project-1', description: 'Working on feature' },
      'test-user-123'
    )
    expect(result.content[0].text).toContain('Time tracking started successfully')
  })
})
```

**Key Testing Areas:**
- Input validation
- Service method calls
- Success/error response formatting
- User authorization

### 3. Service Layer Tests (`__tests__/services/`)

Tests business logic and database interactions with mocked database.

**Example:**
```typescript
import { TimeEntryService } from '@/lib/services/time-entries'

describe('TimeEntryService', () => {
  it('should start time tracking successfully', async () => {
    const service = new TimeEntryService()
    const result = await service.startTimeTracking(userId, projectId, description)
    expect(result.isActive).toBe(true)
  })
})
```

**Key Testing Areas:**
- Business logic validation
- Database operations
- Data transformations
- Error handling

### 4. UI Component Tests (`__tests__/components/`)

Tests React components with user interactions and state changes.

**Example:**
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ActiveTimer from '@/components/dashboard/ActiveTimer'

describe('ActiveTimer', () => {
  it('should handle stop timer action', async () => {
    const user = userEvent.setup()
    render(<ActiveTimer />)
    
    const stopButton = screen.getByRole('button')
    await user.click(stopButton)
    
    expect(mockFetch).toHaveBeenCalledWith('/api/time-entries/active', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'stop' })
    })
  })
})
```

**Key Testing Areas:**
- User interactions
- State management
- API calls
- Event handling
- Loading/error states

## Test Utilities

### `createMockRequest(method, url, body, headers)`
Creates a mock Next.js request for API testing.

### `mockAuthSession(userId)`
Returns a mock authenticated session object.

### `mockTimeEntry(overrides)`
Creates a mock time entry with optional overrides.

### `mockDb`
Mock database object with chainable methods.

## Mock Data

The `__tests__/mocks/mock-data.ts` file provides:
- `mockUsers` - Sample user data
- `mockClients` - Sample client data
- `mockProjects` - Sample project data
- `mockTimeEntries` - Sample time entry data
- `mockApiResponses` - Complete API response shapes

## Best Practices

### 1. Test Organization
- Group related tests with `describe` blocks
- Use descriptive test names that explain the scenario
- Follow the pattern: "should [expected behavior] when [condition]"

### 2. Mocking Strategy
- Mock external dependencies (database, APIs, services)
- Use mock data consistently across tests
- Reset mocks between tests with `beforeEach`

### 3. Component Testing
- Test user interactions, not implementation details
- Use `screen.getByRole` over `screen.getByTestId` when possible
- Test loading states, error states, and success states

### 4. API Testing
- Test both success and failure scenarios
- Verify authentication requirements
- Test input validation and error responses

### 5. Coverage Goals
- Aim for >80% code coverage
- Focus on critical paths and edge cases
- Don't test trivial getters/setters

## Common Patterns

### Testing Async Operations
```typescript
it('should handle async operations', async () => {
  const promise = someAsyncFunction()
  await expect(promise).resolves.toEqual(expectedResult)
})
```

### Testing Error Handling
```typescript
it('should handle errors gracefully', async () => {
  mockService.method.mockRejectedValue(new Error('Test error'))
  const result = await toolHandler()
  expect(result.isError).toBe(true)
})
```

### Testing User Interactions
```typescript
it('should handle user clicks', async () => {
  const user = userEvent.setup()
  render(<Component />)
  await user.click(screen.getByRole('button'))
  expect(mockFunction).toHaveBeenCalled()
})
```

## Troubleshooting

### Common Issues

1. **Mock not working**: Ensure mocks are defined before imports
2. **Async test failures**: Use `await` with user interactions
3. **Database mock issues**: Check that all chained methods return `mockDb`
4. **Component test failures**: Verify required props are provided

### Debug Tips

1. Use `screen.debug()` to see rendered component
2. Add `console.log` in test to debug values
3. Check mock call history with `mockFn.mock.calls`
4. Use `--verbose` flag for detailed test output

## Contributing

When adding new tests:
1. Follow existing patterns and naming conventions
2. Add appropriate mocks for external dependencies
3. Include both success and failure scenarios
4. Update this guide if adding new testing patterns