import { GET, PATCH } from '@/app/api/time-entries/active/route'
import { createMockRequest } from '../utils/test-helpers'
import { mockTimeEntries } from '../mocks/mock-data'

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
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
  },
}))

const mockDb = require('@/drizzle/connection').db

// Mock drizzle operators
jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
  and: jest.fn(),
}))

// Mock the schema
jest.mock('@/drizzle/schema', () => ({
  timeEntries: {
    id: 'id',
    userId: 'userId',
    projectId: 'projectId',
    description: 'description',
    isActive: 'isActive',
    startTime: 'startTime',
    endTime: 'endTime',
    durationMinutes: 'durationMinutes',
    updatedAt: 'updatedAt',
  },
  projects: {
    id: 'id',
    name: 'name',
  },
}))

describe('/api/time-entries/active', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/time-entries/active', () => {
    it('should return active time entry when one exists', async () => {
      const activeEntry = mockTimeEntries.find(entry => entry.isActive)
      const mockEntryWithProject = {
        id: activeEntry?.id,
        projectName: 'Test Project',
        description: activeEntry?.description,
        startTime: activeEntry?.startTime,
        isActive: true,
      }

      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.innerJoin.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.limit.mockResolvedValueOnce([mockEntryWithProject])

      const request = createMockRequest('GET', '/api/time-entries/active')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.id).toBe(activeEntry?.id)
      expect(data.isActive).toBe(true)
      expect(data.projectName).toBe('Test Project')
    })

    it('should return object with isActive false when no active time entry exists', async () => {
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.innerJoin.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.limit.mockResolvedValueOnce([])

      const request = createMockRequest('GET', '/api/time-entries/active')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isActive).toBe(false)
    })

    it('should handle authentication errors', async () => {
      const { getUserIdOrThrow } = require('@/lib/authUtils')
      getUserIdOrThrow.mockRejectedValueOnce(new Error('Unauthorized'))

      const request = createMockRequest('GET', '/api/time-entries/active')
      const response = await GET(request)

      expect(response.status).toBe(500)
    })

    it('should handle database errors', async () => {
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.innerJoin.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.limit.mockRejectedValueOnce(new Error('Database error'))

      const request = createMockRequest('GET', '/api/time-entries/active')
      const response = await GET(request)

      expect(response.status).toBe(500)
    })
  })

  describe('PATCH /api/time-entries/active', () => {
    it('should stop active timer when action is stop', async () => {
      const activeEntry = mockTimeEntries.find(entry => entry.isActive)

      // Mock finding active entry
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.limit.mockResolvedValueOnce([activeEntry])

      // Mock update operation
      mockDb.update.mockReturnValueOnce(mockDb)
      mockDb.set.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.returning.mockResolvedValueOnce([])

      const request = createMockRequest('PATCH', '/api/time-entries/active', {
        action: 'stop'
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.action).toBe('stopped')
      expect(data.durationMinutes).toBeTruthy()
    })

    it('should pause active timer when action is pause', async () => {
      const activeEntry = mockTimeEntries.find(entry => entry.isActive)

      // Mock finding active entry
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.limit.mockResolvedValueOnce([activeEntry])

      // Mock update operation
      mockDb.update.mockReturnValueOnce(mockDb)
      mockDb.set.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.returning.mockResolvedValueOnce([])

      const request = createMockRequest('PATCH', '/api/time-entries/active', {
        action: 'pause'
      })
      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.action).toBe('paused')
      expect(data.durationMinutes).toBeTruthy()
    })

    it('should return 404 when no active timer exists', async () => {
      // Mock no active entry found
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.limit.mockResolvedValueOnce([])

      const request = createMockRequest('PATCH', '/api/time-entries/active', {
        action: 'stop'
      })
      const response = await PATCH(request)

      expect(response.status).toBe(404)
      const text = await response.text()
      expect(text).toBe('No active timer found')
    })

    it('should return 400 for invalid action', async () => {
      const request = createMockRequest('PATCH', '/api/time-entries/active', {
        action: 'invalid'
      })
      const response = await PATCH(request)

      expect(response.status).toBe(400)
      const text = await response.text()
      expect(text).toBe('Invalid action')
    })

    it('should return 400 when action is missing', async () => {
      const request = createMockRequest('PATCH', '/api/time-entries/active', {})
      const response = await PATCH(request)

      expect(response.status).toBe(400)
      const text = await response.text()
      expect(text).toBe('Invalid action')
    })

    it('should handle authentication errors', async () => {
      const { getUserIdOrThrow } = require('@/lib/authUtils')
      getUserIdOrThrow.mockRejectedValueOnce(new Error('Unauthorized'))

      const request = createMockRequest('PATCH', '/api/time-entries/active', {
        action: 'stop'
      })
      const response = await PATCH(request)

      expect(response.status).toBe(500)
    })

    it('should handle database errors during update', async () => {
      const activeEntry = mockTimeEntries.find(entry => entry.isActive)

      // Mock finding active entry
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.limit.mockResolvedValueOnce([activeEntry])

      // Mock update operation failing
      mockDb.update.mockReturnValueOnce(mockDb)
      mockDb.set.mockReturnValueOnce(mockDb)
      mockDb.where.mockRejectedValueOnce(new Error('Database error'))

      const request = createMockRequest('PATCH', '/api/time-entries/active', {
        action: 'stop'
      })
      const response = await PATCH(request)

      expect(response.status).toBe(500)
    })
  })
})