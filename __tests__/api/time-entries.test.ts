import { GET, POST } from '@/app/api/time-entries/route'
import { createMockRequest, mockAuthSession } from '../utils/test-helpers'
import { mockTimeEntries, mockProjects, mockClients } from '../mocks/mock-data'

// Mock the auth utils
jest.mock('@/lib/authUtils', () => ({
  getUserIdOrThrow: jest.fn().mockResolvedValue('test-user-123'),
}))

// Mock the database connection
jest.mock('@/drizzle/connection', () => ({
  db: {
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
  },
}))

const mockDb = require('@/drizzle/connection').db

// Mock drizzle operators
jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
  desc: jest.fn(),
  sql: jest.fn(),
  and: jest.fn(),
  inArray: jest.fn(),
}))

// Mock the schema
jest.mock('@/drizzle/schema', () => ({
  timeEntries: {
    id: 'id',
    userId: 'userId',
    projectId: 'projectId',
    description: 'description',
    startTime: 'startTime',
    endTime: 'endTime',
    durationMinutes: 'durationMinutes',
    isActive: 'isActive',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  projects: {
    id: 'id',
    name: 'name',
    clientId: 'clientId',
  },
  clients: {
    id: 'id',
    name: 'name',
  },
}))

describe('/api/time-entries', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/time-entries', () => {
    it('should return time entries with pagination', async () => {
      const mockEntries = mockTimeEntries.filter(entry => !entry.isActive)
      
      // Mock the database query chain - first call for entries
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.innerJoin.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.orderBy.mockReturnValueOnce(mockDb)
      mockDb.limit.mockReturnValueOnce(mockDb)
      mockDb.offset.mockResolvedValueOnce(mockEntries.map(entry => ({
        ...entry,
        projectName: 'Test Project',
        clientName: 'Test Client',
      })))

      // Mock the count query - second call for total count
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.innerJoin.mockReturnValueOnce(mockDb)
      mockDb.where.mockResolvedValueOnce([{ count: mockEntries.length }])

      const request = createMockRequest('GET', '/api/time-entries?page=1&limit=10')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toHaveProperty('entries')
      expect(data).toHaveProperty('total')
      expect(data.total).toBe(mockEntries.length)
    })

    it('should handle search parameters', async () => {
      const request = createMockRequest('GET', '/api/time-entries?search=homepage&page=1&limit=10')
      
      // Mock entries query
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.innerJoin.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.orderBy.mockReturnValueOnce(mockDb)
      mockDb.limit.mockReturnValueOnce(mockDb)
      mockDb.offset.mockResolvedValueOnce([])

      // Mock count query
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.innerJoin.mockReturnValueOnce(mockDb)
      mockDb.where.mockResolvedValueOnce([{ count: 0 }])

      const response = await GET(request)
      
      expect(response.status).toBe(200)
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should handle date range filtering', async () => {
      const request = createMockRequest('GET', '/api/time-entries?dateFrom=2024-01-01&dateTo=2024-01-31&page=1&limit=10')
      
      // Mock entries query
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.innerJoin.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.orderBy.mockReturnValueOnce(mockDb)
      mockDb.limit.mockReturnValueOnce(mockDb)
      mockDb.offset.mockResolvedValueOnce([])

      // Mock count query
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.innerJoin.mockReturnValueOnce(mockDb)
      mockDb.where.mockResolvedValueOnce([{ count: 0 }])

      const response = await GET(request)
      
      expect(response.status).toBe(200)
      expect(mockDb.where).toHaveBeenCalled()
    })

    it('should handle authentication errors', async () => {
      const { getUserIdOrThrow } = require('@/lib/authUtils')
      getUserIdOrThrow.mockRejectedValueOnce(new Error('Unauthorized'))

      const request = createMockRequest('GET', '/api/time-entries')
      const response = await GET(request)

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/time-entries', () => {
    it('should create a new time entry', async () => {
      const newEntry = {
        projectId: 'test-project-1',
        description: 'New work session',
      }

      // Mock checking for existing active timer
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.limit.mockResolvedValueOnce([]) // No existing active timer

      // Mock project verification
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.innerJoin.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.limit.mockResolvedValueOnce([mockProjects[0]]) // Project exists

      // Mock insertion
      const mockCreatedEntry = {
        id: 'new-entry-id',
        userId: 'test-user-123',
        projectId: newEntry.projectId,
        description: newEntry.description,
        startTime: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.insert.mockReturnValueOnce(mockDb)
      mockDb.values.mockReturnValueOnce(mockDb)
      mockDb.returning.mockResolvedValueOnce([mockCreatedEntry])

      const request = createMockRequest('POST', '/api/time-entries', newEntry)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.projectId).toBe(newEntry.projectId)
      expect(data.description).toBe(newEntry.description)
      expect(data.isActive).toBe(true)
    })

    it('should reject creation if active timer already exists', async () => {
      const newEntry = {
        projectId: 'test-project-1',
        description: 'New work session',
      }

      // Mock existing active timer
      mockDb.select.mockImplementationOnce(() => ({
        ...mockDb,
        from: () => ({
          ...mockDb,
          where: () => ({
            ...mockDb,
            limit: () => Promise.resolve([mockTimeEntries[2]]) // Active timer exists
          })
        })
      }))

      const request = createMockRequest('POST', '/api/time-entries', newEntry)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const text = await response.text()
      expect(text).toBe('An active timer is already running')
    })

    it('should reject creation if project not found', async () => {
      const newEntry = {
        projectId: 'non-existent-project',
        description: 'New work session',
      }

      // Mock no existing active timer
      mockDb.select.mockImplementationOnce(() => ({
        ...mockDb,
        from: () => ({
          ...mockDb,
          where: () => ({
            ...mockDb,
            limit: () => Promise.resolve([])
          })
        })
      }))

      // Mock project not found
      mockDb.select.mockImplementationOnce(() => ({
        ...mockDb,
        from: () => ({
          ...mockDb,
          innerJoin: () => ({
            ...mockDb,
            where: () => ({
              ...mockDb,
              limit: () => Promise.resolve([]) // Project not found
            })
          })
        })
      }))

      const request = createMockRequest('POST', '/api/time-entries', newEntry)
      const response = await POST(request)

      expect(response.status).toBe(404)
      const text = await response.text()
      expect(text).toBe('Project not found')
    })

    it('should reject creation without projectId', async () => {
      const newEntry = {
        description: 'New work session',
      }

      const request = createMockRequest('POST', '/api/time-entries', newEntry)
      const response = await POST(request)

      expect(response.status).toBe(400)
      const text = await response.text()
      expect(text).toBe('Project ID is required')
    })

    it('should handle authentication errors', async () => {
      const { getUserIdOrThrow } = require('@/lib/authUtils')
      getUserIdOrThrow.mockRejectedValueOnce(new Error('Unauthorized'))

      const request = createMockRequest('POST', '/api/time-entries', {
        projectId: 'test-project-1',
        description: 'Test',
      })
      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })
})