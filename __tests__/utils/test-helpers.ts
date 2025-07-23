import { createRequest, createResponse } from 'node-mocks-http'

export const createMockRequest = (
  method: string = 'GET',
  url: string = '/api/test',
  body?: any,
  headers?: Record<string, string>
) => {
  return new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

export const createMockResponse = () => {
  return createResponse()
}

export const mockAuthSession = (userId: string = 'test-user-123') => {
  return {
    userId,
    user: {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
    },
    session: {
      id: 'test-session-id',
      userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
    },
  }
}

export const mockTimeEntry = (overrides?: Partial<any>) => ({
  id: 'test-entry-1',
  userId: 'test-user-123',
  projectId: 'test-project-1',
  description: 'Test work',
  startTime: new Date('2024-01-01T09:00:00Z'),
  endTime: new Date('2024-01-01T10:00:00Z'),
  durationMinutes: 60,
  isActive: false,
  createdAt: new Date('2024-01-01T09:00:00Z'),
  updatedAt: new Date('2024-01-01T10:00:00Z'),
  ...overrides,
})

export const mockProject = (overrides?: Partial<any>) => ({
  id: 'test-project-1',
  name: 'Test Project',
  description: 'Test project description',
  clientId: 'test-client-1',
  userId: 'test-user-123',
  hourlyRate: 50,
  active: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
})

export const mockClient = (overrides?: Partial<any>) => ({
  id: 'test-client-1',
  name: 'Test Client',
  email: 'client@example.com',
  userId: 'test-user-123',
  active: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
})

export const mockMcpToolResponse = (content: string, isError: boolean = false) => ({
  content: [
    {
      type: 'text' as const,
      text: content,
    },
  ],
  isError,
})

// Database mocking utilities
export const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  offset: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
}

export const setupMockDb = () => {
  jest.mock('@/drizzle/connection', () => ({
    db: mockDb,
  }))
}

export const resetMockDb = () => {
  Object.values(mockDb).forEach(fn => {
    if (typeof fn === 'function') {
      fn.mockClear()
    }
  })
}

// Async test utilities
export const waitForAsync = (ms: number = 0) => 
  new Promise(resolve => setTimeout(resolve, ms))

export const flushPromises = () => new Promise(resolve => setImmediate(resolve))