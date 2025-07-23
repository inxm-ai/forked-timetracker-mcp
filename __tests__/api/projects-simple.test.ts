import { GET } from '@/app/api/projects/route'
import { createMockRequest } from '../utils/test-helpers'

// Mock the auth utils
jest.mock('@/lib/authUtils', () => ({
  getUserIdOrThrow: jest.fn().mockResolvedValue('test-user-123'),
}))

// Mock the database connection
jest.mock('@/drizzle/connection', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockResolvedValue([]),
  },
}))

describe('Projects API Simple Test', () => {
  it('should return projects successfully', async () => {
    const request = createMockRequest('GET', '/api/projects')
    const response = await GET(request)
    
    expect(response.status).toBe(200)
  })
})