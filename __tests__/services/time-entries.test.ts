import { TimeEntryService } from '@/lib/services/time-entries'
import { mockTimeEntry, mockProject } from '../utils/test-helpers'
import { mockTimeEntries, mockProjects } from '../mocks/mock-data'

// Mock the database connection
jest.mock('@/drizzle/connection', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
  },
}))

const mockDb = require('@/drizzle/connection').db

// Mock drizzle operators
jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
  and: jest.fn(),
  isNotNull: jest.fn(),
  desc: jest.fn(),
  gte: jest.fn(),
  lte: jest.fn(),
  sql: jest.fn(),
}))

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn().mockReturnValue('test-generated-id'),
}))

describe('TimeEntryService', () => {
  let service: TimeEntryService

  beforeEach(() => {
    service = new TimeEntryService()
    jest.clearAllMocks()
  })

  describe('startTimeTracking', () => {
    it('should start time tracking successfully', async () => {
      const userId = 'test-user-123'
      const projectId = 'test-project-1'
      const description = 'Working on feature'

      // Mock project verification
      mockDb.select.mockImplementationOnce(() => ({
        ...mockDb,
        from: () => ({
          ...mockDb,
          where: () => ({
            ...mockDb,
            limit: () => Promise.resolve([mockProjects[0]])
          })
        })
      }))

      // Mock checking for existing active entry
      mockDb.select.mockImplementationOnce(() => ({
        ...mockDb,
        from: () => ({
          ...mockDb,
          where: () => ({
            ...mockDb,
            limit: () => Promise.resolve([]) // No active entry
          })
        })
      }))

      // Mock insertion
      const newEntry = mockTimeEntry({
        id: 'test-generated-id',
        userId,
        projectId,
        description,
        isActive: true,
      })

      mockDb.insert.mockImplementation(() => mockDb)
      mockDb.values.mockImplementation(() => mockDb)
      mockDb.returning.mockImplementation(() => Promise.resolve([newEntry]))

      const result = await service.startTimeTracking(userId, projectId, description)

      expect(result.id).toBe('test-generated-id')
      expect(result.userId).toBe(userId)
      expect(result.projectId).toBe(projectId)
      expect(result.description).toBe(description)
      expect(result.isActive).toBe(true)
    })

    it('should throw error when project not found', async () => {
      const userId = 'test-user-123'
      const projectId = 'non-existent-project'
      const description = 'Working on feature'

      // Mock project not found
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

      await expect(
        service.startTimeTracking(userId, projectId, description)
      ).rejects.toThrow('Project not found or does not belong to user')
    })

    it('should throw error when active entry already exists', async () => {
      const userId = 'test-user-123'
      const projectId = 'test-project-1'
      const description = 'Working on feature'

      // Mock project exists
      mockDb.select.mockImplementationOnce(() => ({
        ...mockDb,
        from: () => ({
          ...mockDb,
          where: () => ({
            ...mockDb,
            limit: () => Promise.resolve([mockProjects[0]])
          })
        })
      }))

      // Mock active entry exists
      mockDb.select.mockImplementationOnce(() => ({
        ...mockDb,
        from: () => ({
          ...mockDb,
          where: () => ({
            ...mockDb,
            limit: () => Promise.resolve([mockTimeEntries[2]]) // Active entry
          })
        })
      }))

      await expect(
        service.startTimeTracking(userId, projectId, description)
      ).rejects.toThrow('There is already an active time entry. Stop it first.')
    })
  })

  describe('stopTimeTracking', () => {
    it('should stop time tracking successfully', async () => {
      const userId = 'test-user-123'
      const activeEntry = mockTimeEntries[2] // Active entry
      const stoppedEntry = {
        ...activeEntry,
        endTime: new Date(),
        durationMinutes: 120,
        isActive: false,
      }

      // Mock finding active entry
      mockDb.select.mockImplementationOnce(() => ({
        ...mockDb,
        from: () => ({
          ...mockDb,
          where: () => ({
            ...mockDb,
            limit: () => Promise.resolve([activeEntry])
          })
        })
      }))

      // Mock update
      mockDb.update.mockImplementation(() => mockDb)
      mockDb.set.mockImplementation(() => mockDb)
      mockDb.where.mockImplementation(() => mockDb)
      mockDb.returning.mockImplementation(() => Promise.resolve([stoppedEntry]))

      const result = await service.stopTimeTracking(userId)

      expect(result.isActive).toBe(false)
      expect(result.endTime).toBeTruthy()
      expect(result.durationMinutes).toBe(120)
    })

    it('should stop specific time entry by ID', async () => {
      const userId = 'test-user-123'
      const entryId = 'test-entry-3'
      const activeEntry = mockTimeEntries[2]
      const stoppedEntry = {
        ...activeEntry,
        endTime: new Date(),
        durationMinutes: 90,
        isActive: false,
      }

      // Mock finding specific active entry
      mockDb.select.mockImplementationOnce(() => ({
        ...mockDb,
        from: () => ({
          ...mockDb,
          where: () => ({
            ...mockDb,
            limit: () => Promise.resolve([activeEntry])
          })
        })
      }))

      // Mock update
      mockDb.update.mockImplementation(() => mockDb)
      mockDb.set.mockImplementation(() => mockDb)
      mockDb.where.mockImplementation(() => mockDb)
      mockDb.returning.mockImplementation(() => Promise.resolve([stoppedEntry]))

      const result = await service.stopTimeTracking(userId, entryId)

      expect(result.isActive).toBe(false)
      expect(result.durationMinutes).toBe(90)
    })

    it('should throw error when no active entry found', async () => {
      const userId = 'test-user-123'

      // Mock no active entry found
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

      await expect(
        service.stopTimeTracking(userId)
      ).rejects.toThrow('No active time entry found')
    })
  })

  describe('getActiveTimeEntry', () => {
    it('should return active time entry', async () => {
      const userId = 'test-user-123'
      const activeEntry = mockTimeEntries[2]

      mockDb.select.mockImplementationOnce(() => ({
        ...mockDb,
        from: () => ({
          ...mockDb,
          where: () => ({
            ...mockDb,
            limit: () => Promise.resolve([activeEntry])
          })
        })
      }))

      const result = await service.getActiveTimeEntry(userId)

      expect(result).toEqual(activeEntry)
    })

    it('should return null when no active entry', async () => {
      const userId = 'test-user-123'

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

      const result = await service.getActiveTimeEntry(userId)

      expect(result).toBeNull()
    })
  })

  describe('addManualTimeEntry', () => {
    it('should add manual time entry successfully', async () => {
      const userId = 'test-user-123'
      const projectId = 'test-project-1'
      const description = 'Manual work'
      const startTime = new Date('2024-01-01T10:00:00Z')
      const endTime = new Date('2024-01-01T12:00:00Z')

      // Mock project verification
      mockDb.select.mockImplementationOnce(() => ({
        ...mockDb,
        from: () => ({
          ...mockDb,
          where: () => ({
            ...mockDb,
            limit: () => Promise.resolve([mockProjects[0]])
          })
        })
      }))

      // Mock insertion
      const newEntry = mockTimeEntry({
        id: 'test-generated-id',
        userId,
        projectId,
        description,
        startTime,
        endTime,
        durationMinutes: 120,
        isActive: false,
      })

      mockDb.insert.mockImplementation(() => mockDb)
      mockDb.values.mockImplementation(() => mockDb)
      mockDb.returning.mockImplementation(() => Promise.resolve([newEntry]))

      const result = await service.addManualTimeEntry(
        userId,
        projectId,
        description,
        startTime,
        endTime
      )

      expect(result.durationMinutes).toBe(120)
      expect(result.isActive).toBe(false)
      expect(result.startTime).toEqual(startTime)
      expect(result.endTime).toEqual(endTime)
    })

    it('should throw error when project not found', async () => {
      const userId = 'test-user-123'
      const projectId = 'non-existent-project'
      const description = 'Manual work'
      const startTime = new Date('2024-01-01T10:00:00Z')
      const endTime = new Date('2024-01-01T12:00:00Z')

      // Mock project not found
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

      await expect(
        service.addManualTimeEntry(userId, projectId, description, startTime, endTime)
      ).rejects.toThrow('Project not found or does not belong to user')
    })

    it('should throw error when end time is before start time', async () => {
      const userId = 'test-user-123'
      const projectId = 'test-project-1'
      const description = 'Manual work'
      const startTime = new Date('2024-01-01T12:00:00Z')
      const endTime = new Date('2024-01-01T10:00:00Z')

      // Mock project exists
      mockDb.select.mockImplementationOnce(() => ({
        ...mockDb,
        from: () => ({
          ...mockDb,
          where: () => ({
            ...mockDb,
            limit: () => Promise.resolve([mockProjects[0]])
          })
        })
      }))

      await expect(
        service.addManualTimeEntry(userId, projectId, description, startTime, endTime)
      ).rejects.toThrow('End time must be after start time')
    })
  })

  describe('updateTimeEntry', () => {
    it('should update time entry successfully', async () => {
      const userId = 'test-user-123'
      const entryId = 'test-entry-1'
      const updateData = {
        description: 'Updated description',
        startTime: new Date('2024-01-01T09:00:00Z'),
        endTime: new Date('2024-01-01T11:00:00Z'),
      }

      // Mock finding current entry
      mockDb.select.mockImplementationOnce(() => ({
        ...mockDb,
        from: () => ({
          ...mockDb,
          where: () => ({
            ...mockDb,
            limit: () => Promise.resolve([mockTimeEntries[0]])
          })
        })
      }))

      // Mock update
      const updatedEntry = {
        ...mockTimeEntries[0],
        ...updateData,
        durationMinutes: 120,
      }

      mockDb.update.mockImplementation(() => mockDb)
      mockDb.set.mockImplementation(() => mockDb)
      mockDb.where.mockImplementation(() => mockDb)
      mockDb.returning.mockImplementation(() => Promise.resolve([updatedEntry]))

      const result = await service.updateTimeEntry(userId, entryId, updateData)

      expect(result?.description).toBe('Updated description')
      expect(result?.durationMinutes).toBe(120)
    })

    it('should return null when entry not found', async () => {
      const userId = 'test-user-123'
      const entryId = 'non-existent'
      const updateData = { description: 'Updated description' }

      // Mock update returning nothing
      mockDb.update.mockImplementation(() => mockDb)
      mockDb.set.mockImplementation(() => mockDb)
      mockDb.where.mockImplementation(() => mockDb)
      mockDb.returning.mockImplementation(() => Promise.resolve([]))

      const result = await service.updateTimeEntry(userId, entryId, updateData)

      expect(result).toBeNull()
    })
  })

  describe('listTimeEntries', () => {
    it('should list time entries with default parameters', async () => {
      const userId = 'test-user-123'
      const userEntries = mockTimeEntries.filter(entry => entry.userId === userId)

      mockDb.select.mockImplementation(() => mockDb)
      mockDb.from.mockImplementation(() => mockDb)
      mockDb.where.mockImplementation(() => mockDb)
      mockDb.orderBy.mockImplementation(() => mockDb)
      mockDb.limit.mockImplementation(() => Promise.resolve(userEntries))

      const result = await service.listTimeEntries(userId)

      expect(result).toEqual(userEntries)
    })

    it('should list time entries with filters', async () => {
      const userId = 'test-user-123'
      const projectId = 'test-project-1'
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')
      const limit = 20

      const filteredEntries = mockTimeEntries.filter(
        entry => entry.userId === userId && entry.projectId === projectId
      )

      mockDb.select.mockImplementation(() => mockDb)
      mockDb.from.mockImplementation(() => mockDb)
      mockDb.where.mockImplementation(() => mockDb)
      mockDb.orderBy.mockImplementation(() => mockDb)
      mockDb.limit.mockImplementation(() => Promise.resolve(filteredEntries))

      const result = await service.listTimeEntries(userId, projectId, startDate, endDate, limit)

      expect(result).toEqual(filteredEntries)
    })
  })

  describe('deleteTimeEntry', () => {
    it('should delete time entry successfully', async () => {
      const userId = 'test-user-123'
      const entryId = 'test-entry-1'

      mockDb.delete.mockImplementation(() => mockDb)
      mockDb.where.mockImplementation(() => ({ rowCount: 1 }))

      const result = await service.deleteTimeEntry(userId, entryId)

      expect(result).toBe(true)
    })

    it('should return false when entry not found', async () => {
      const userId = 'test-user-123'
      const entryId = 'non-existent'

      mockDb.delete.mockImplementation(() => mockDb)
      mockDb.where.mockImplementation(() => ({ rowCount: 0 }))

      const result = await service.deleteTimeEntry(userId, entryId)

      expect(result).toBe(false)
    })
  })
})