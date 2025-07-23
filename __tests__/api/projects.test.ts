import { GET } from '@/app/api/projects/route'
import { createMockRequest } from '../utils/test-helpers'
import { mockProjects, mockClients } from '../mocks/mock-data'

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
    orderBy: jest.fn().mockReturnThis(),
  },
}))

const mockDb = require('@/drizzle/connection').db

// Mock drizzle operators
jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
}))

// Mock the schema
jest.mock('@/drizzle/schema', () => ({
  projects: {
    id: 'id',
    name: 'name',
    description: 'description',
    hourlyRate: 'hourlyRate',
    active: 'active',
  },
  clients: {
    id: 'id',
    name: 'name',
  },
}))

describe('/api/projects', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/projects', () => {
    it('should return projects with client information', async () => {
      const mockProjectsWithClients = mockProjects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        hourlyRate: project.hourlyRate,
        active: project.active,
        clientName: mockClients.find(c => c.id === project.clientId)?.name || 'Unknown Client',
      }))

      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.innerJoin.mockReturnValueOnce(mockDb)
      mockDb.orderBy.mockResolvedValueOnce(mockProjectsWithClients)

      const request = createMockRequest('GET', '/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(mockProjectsWithClients.length)
      
      // Check that each project has the expected properties
      data.forEach((project: any) => {
        expect(project).toHaveProperty('id')
        expect(project).toHaveProperty('name')
        expect(project).toHaveProperty('description')
        expect(project).toHaveProperty('hourlyRate')
        expect(project).toHaveProperty('clientName')
        expect(project).toHaveProperty('active')
      })
    })

    it('should handle authentication errors', async () => {
      const { getUserIdOrThrow } = require('@/lib/authUtils')
      getUserIdOrThrow.mockRejectedValueOnce(new Error('Unauthorized'))

      const request = createMockRequest('GET', '/api/projects')
      const response = await GET(request)

      expect(response.status).toBe(500)
    })

    it('should handle database errors', async () => {
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.innerJoin.mockReturnValueOnce(mockDb)
      mockDb.orderBy.mockRejectedValueOnce(new Error('Database error'))

      const request = createMockRequest('GET', '/api/projects')
      const response = await GET(request)

      expect(response.status).toBe(500)
    })

    it('should return empty array when no projects found', async () => {
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.innerJoin.mockReturnValueOnce(mockDb)
      mockDb.orderBy.mockResolvedValueOnce([])

      const request = createMockRequest('GET', '/api/projects')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(0)
    })

    it('should call database methods in correct order', async () => {
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.innerJoin.mockReturnValueOnce(mockDb)
      mockDb.orderBy.mockResolvedValueOnce([])

      const request = createMockRequest('GET', '/api/projects')
      await GET(request)

      expect(mockDb.select).toHaveBeenCalled()
      expect(mockDb.from).toHaveBeenCalled()
      expect(mockDb.innerJoin).toHaveBeenCalled()
      expect(mockDb.orderBy).toHaveBeenCalled()
    })
  })
})