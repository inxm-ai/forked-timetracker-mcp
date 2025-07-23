import { mockTimeEntry, mockProject } from '../utils/test-helpers'

// Mock the database connection first
jest.mock('@/drizzle/connection', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}))

// Mock drizzle operations
jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
  and: jest.fn(),
  desc: jest.fn(),
  sql: jest.fn(),
  isNotNull: jest.fn(),
  gte: jest.fn(),
  lte: jest.fn(),
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
    userId: 'userId',
  },
  clients: {
    id: 'id',
    name: 'name',
  },
}))

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn().mockReturnValue('mock-id'),
}))

// Mock the TimeEntryService
jest.mock('@/lib/services/time-entries', () => {
  const mockServiceMethods = {
    startTimeTracking: jest.fn(),
    stopTimeTracking: jest.fn(),
    getActiveTimeEntry: jest.fn(),
    addManualTimeEntry: jest.fn(),
    updateTimeEntry: jest.fn(),
  }
  
  return {
    TimeEntryService: jest.fn().mockImplementation(() => mockServiceMethods),
    __mockServiceMethods: mockServiceMethods, // Export for testing
  }
})

// Import the tools after mocking
import { 
  startTimeTrackingTool,
  stopTimeTrackingTool,
  getActiveTimeEntryTool,
  addManualTimeEntryTool,
  updateTimeEntryTool
} from '@/lib/mcp-tools/time-tracking-tools'

// Get the mock service methods for assertions
const mockTimeEntryService = (require('@/lib/services/time-entries') as any).__mockServiceMethods

describe('Time Tracking MCP Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('startTimeTrackingTool', () => {
    it('should start time tracking successfully', async () => {
      const mockEntry = mockTimeEntry({
        id: 'new-entry-id',
        projectId: 'test-project-1',
        description: 'Working on feature',
        startTime: new Date('2024-01-01T10:00:00Z'),
        isActive: true,
      })

      mockTimeEntryService.startTimeTracking.mockResolvedValueOnce(mockEntry)

      const result = await startTimeTrackingTool.handler(
        { projectId: 'test-project-1', description: 'Working on feature' },
        'test-user-123'
      )

      expect(mockTimeEntryService.startTimeTracking).toHaveBeenCalledWith(
        'test-user-123',
        'test-project-1',
        'Working on feature'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
      expect(result.content[0].text).toContain('Time tracking started successfully')
      expect(result.content[0].text).toContain('new-entry-id')
      expect(result.content[0].text).toContain('test-project-1')
    })

    it('should handle start tracking errors', async () => {
      mockTimeEntryService.startTimeTracking.mockRejectedValueOnce(
        new Error('Project not found')
      )

      const result = await startTimeTrackingTool.handler(
        { projectId: 'non-existent', description: 'Working on feature' },
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
      expect(result.content[0].text).toContain('Error starting time tracking')
      expect(result.content[0].text).toContain('Project not found')
      expect(result.isError).toBe(true)
    })

    it('should validate required parameters', () => {
      expect(startTimeTrackingTool.schema.projectId).toBeDefined()
      expect(startTimeTrackingTool.schema.description).toBeDefined()
    })
  })

  describe('stopTimeTrackingTool', () => {
    it('should stop time tracking successfully', async () => {
      const mockEntry = mockTimeEntry({
        id: 'entry-id',
        durationMinutes: 120,
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        isActive: false,
      })

      mockTimeEntryService.stopTimeTracking.mockResolvedValueOnce(mockEntry)

      const result = await stopTimeTrackingTool.handler(
        { entryId: 'entry-id' },
        'test-user-123'
      )

      expect(mockTimeEntryService.stopTimeTracking).toHaveBeenCalledWith(
        'test-user-123',
        'entry-id'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
      expect(result.content[0].text).toContain('Time tracking stopped successfully')
      expect(result.content[0].text).toContain('2h 0m')
      expect(result.content[0].text).toContain('120 minutes')
    })

    it('should stop time tracking without entryId', async () => {
      const mockEntry = mockTimeEntry({
        id: 'entry-id',
        durationMinutes: 90,
        isActive: false,
      })

      mockTimeEntryService.stopTimeTracking.mockResolvedValueOnce(mockEntry)

      const result = await stopTimeTrackingTool.handler(
        {},
        'test-user-123'
      )

      expect(mockTimeEntryService.stopTimeTracking).toHaveBeenCalledWith(
        'test-user-123',
        undefined
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('Time tracking stopped successfully')
      expect(result.content[0].text).toContain('1h 30m')
    })

    it('should handle no active entry to stop', async () => {
      mockTimeEntryService.stopTimeTracking.mockResolvedValueOnce(null)

      const result = await stopTimeTrackingTool.handler(
        {},
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toBe('No active time entry found to stop.')
      expect(result.isError).toBe(true)
    })

    it('should handle stop tracking errors', async () => {
      mockTimeEntryService.stopTimeTracking.mockRejectedValueOnce(
        new Error('Database error')
      )

      const result = await stopTimeTrackingTool.handler(
        {},
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('Error stopping time tracking')
      expect(result.content[0].text).toContain('Database error')
      expect(result.isError).toBe(true)
    })
  })

  describe('getActiveTimeEntryTool', () => {
    it('should return active time entry', async () => {
      const mockEntry = mockTimeEntry({
        id: 'active-entry',
        projectId: 'project-1',
        description: 'Working on feature',
        startTime: new Date('2024-01-01T10:00:00Z'),
        isActive: true,
      })

      mockTimeEntryService.getActiveTimeEntry.mockResolvedValueOnce(mockEntry)

      // Mock current time for elapsed calculation
      const mockNow = new Date('2024-01-01T10:30:00Z')
      const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(mockNow.getTime())
      
      // Also mock the Date constructor for the new Date() call in the handler
      const originalDate = Date
      const dateSpy = jest.spyOn(global, 'Date').mockImplementation(((dateString?: string | number | Date) => {
        if (dateString === undefined) {
          return new originalDate(mockNow.getTime())
        }
        return new originalDate(dateString)
      }) as any)

      const result = await getActiveTimeEntryTool.handler(
        {},
        'test-user-123'
      )

      expect(mockTimeEntryService.getActiveTimeEntry).toHaveBeenCalledWith('test-user-123')

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('Active time tracking')
      expect(result.content[0].text).toContain('active-entry')
      expect(result.content[0].text).toContain('project-1')
      expect(result.content[0].text).toContain('Working on feature')
      expect(result.content[0].text).toContain('0h 30m')
      
      // Restore the original Date
      dateNowSpy.mockRestore()
      dateSpy.mockRestore()
    })

    it('should handle no active entry', async () => {
      mockTimeEntryService.getActiveTimeEntry.mockResolvedValueOnce(null)

      const result = await getActiveTimeEntryTool.handler(
        {},
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toBe('No active time tracking session found.')
    })

    it('should handle get active entry errors', async () => {
      mockTimeEntryService.getActiveTimeEntry.mockRejectedValueOnce(
        new Error('Database error')
      )

      const result = await getActiveTimeEntryTool.handler(
        {},
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('Error getting active time entry')
      expect(result.content[0].text).toContain('Database error')
      expect(result.isError).toBe(true)
    })
  })

  describe('addManualTimeEntryTool', () => {
    it('should add manual time entry successfully', async () => {
      const mockEntry = mockTimeEntry({
        id: 'manual-entry',
        projectId: 'project-1',
        description: 'Manual work',
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T12:00:00Z'),
        durationMinutes: 120,
        isActive: false,
      })

      mockTimeEntryService.addManualTimeEntry.mockResolvedValueOnce(mockEntry)

      const result = await addManualTimeEntryTool.handler(
        {
          projectId: 'project-1',
          description: 'Manual work',
          startTime: '2024-01-01T10:00:00Z',
          endTime: '2024-01-01T12:00:00Z',
        },
        'test-user-123'
      )

      expect(mockTimeEntryService.addManualTimeEntry).toHaveBeenCalledWith(
        'test-user-123',
        'project-1',
        'Manual work',
        new Date('2024-01-01T10:00:00Z'),
        new Date('2024-01-01T12:00:00Z')
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('Manual time entry added successfully')
      expect(result.content[0].text).toContain('manual-entry')
      expect(result.content[0].text).toContain('2h 0m')
      expect(result.content[0].text).toContain('120 minutes')
    })

    it('should handle add manual entry errors', async () => {
      mockTimeEntryService.addManualTimeEntry.mockRejectedValueOnce(
        new Error('Invalid date range')
      )

      const result = await addManualTimeEntryTool.handler(
        {
          projectId: 'project-1',
          description: 'Manual work',
          startTime: '2024-01-01T12:00:00Z',
          endTime: '2024-01-01T10:00:00Z',
        },
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('Error adding manual time entry')
      expect(result.content[0].text).toContain('Invalid date range')
      expect(result.isError).toBe(true)
    })

    it('should validate required parameters', () => {
      expect(addManualTimeEntryTool.schema.projectId).toBeDefined()
      expect(addManualTimeEntryTool.schema.description).toBeDefined()
      expect(addManualTimeEntryTool.schema.startTime).toBeDefined()
      expect(addManualTimeEntryTool.schema.endTime).toBeDefined()
    })
  })

  describe('updateTimeEntryTool', () => {
    it('should update time entry successfully', async () => {
      const mockEntry = mockTimeEntry({
        id: 'entry-id',
        description: 'Updated description',
        durationMinutes: 180,
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T13:00:00Z'),
      })

      mockTimeEntryService.updateTimeEntry.mockResolvedValueOnce(mockEntry)

      const result = await updateTimeEntryTool.handler(
        {
          entryId: 'entry-id',
          description: 'Updated description',
          startTime: '2024-01-01T10:00:00Z',
          endTime: '2024-01-01T13:00:00Z',
        },
        'test-user-123'
      )

      expect(mockTimeEntryService.updateTimeEntry).toHaveBeenCalledWith(
        'test-user-123',
        'entry-id',
        {
          description: 'Updated description',
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T13:00:00Z'),
        }
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('Time entry updated successfully')
      expect(result.content[0].text).toContain('entry-id')
      expect(result.content[0].text).toContain('Updated description')
      expect(result.content[0].text).toContain('3h 0m')
    })

    it('should handle entry not found', async () => {
      mockTimeEntryService.updateTimeEntry.mockResolvedValueOnce(null)

      const result = await updateTimeEntryTool.handler(
        {
          entryId: 'non-existent',
          description: 'Updated description',
        },
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toBe('Time entry not found or does not belong to you.')
      expect(result.isError).toBe(true)
    })

    it('should handle update errors', async () => {
      mockTimeEntryService.updateTimeEntry.mockRejectedValueOnce(
        new Error('Database error')
      )

      const result = await updateTimeEntryTool.handler(
        {
          entryId: 'entry-id',
          description: 'Updated description',
        },
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('Error updating time entry')
      expect(result.content[0].text).toContain('Database error')
      expect(result.isError).toBe(true)
    })

    it('should validate required entryId parameter', () => {
      expect(updateTimeEntryTool.schema.entryId).toBeDefined()
    })

    it('should handle optional parameters', () => {
      expect(updateTimeEntryTool.schema.description).toBeDefined()
      expect(updateTimeEntryTool.schema.startTime).toBeDefined()
      expect(updateTimeEntryTool.schema.endTime).toBeDefined()
    })
  })
})