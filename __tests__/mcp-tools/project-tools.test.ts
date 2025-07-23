import { mockProject } from '../utils/test-helpers'
import { mockProjects } from '../mocks/mock-data'

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
  projects: {
    id: 'id',
    userId: 'userId',
    clientId: 'clientId',
    name: 'name',
    description: 'description',
    hourlyRate: 'hourlyRate',
    active: 'active',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  clients: {
    id: 'id',
    userId: 'userId',
    name: 'name',
    active: 'active',
  },
}))

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn().mockReturnValue('mock-id'),
}))

// Mock the ProjectService
jest.mock('@/lib/services/projects', () => {
  const mockServiceMethods = {
    createProject: jest.fn(),
    listProjects: jest.fn(),
    updateProject: jest.fn(),
    deactivateProject: jest.fn(),
  }
  
  return {
    ProjectService: jest.fn().mockImplementation(() => mockServiceMethods),
    __mockServiceMethods: mockServiceMethods,
  }
})

// Import the tools after mocking
import {
  createProjectTool,
  listProjectsTool,
  updateProjectTool,
  deactivateProjectTool,
} from '@/lib/mcp-tools/project-tools'

// Get the mock service methods for assertions
const mockProjectService = (require('@/lib/services/projects') as any).__mockServiceMethods

describe('Project MCP Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createProjectTool', () => {
    it('should create project successfully', async () => {
      const newProject = mockProject({
        id: 'new-project-id',
        name: 'New Project',
        description: 'Project description',
        clientId: 'test-client-1',
        hourlyRate: 75,
      })

      mockProjectService.createProject.mockResolvedValueOnce(newProject)

      const result = await createProjectTool.handler(
        {
          name: 'New Project',
          description: 'Project description',
          clientId: 'test-client-1',
          hourlyRate: "75",
        },
        'test-user-123'
      )

      expect(mockProjectService.createProject).toHaveBeenCalledWith(
        'test-user-123',
        {
          name: 'New Project',
          description: 'Project description',
          clientId: 'test-client-1',
          hourlyRate: "75"
        }
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
      expect(result.content[0].text).toContain('Project created successfully')
      expect(result.content[0].text).toContain('new-project-id')
      expect(result.content[0].text).toContain('New Project')
      expect(result.content[0].text).toContain('test-client-1')
      expect(result.content[0].text).toContain('$75')
    })

    it('should handle create project errors', async () => {
      mockProjectService.createProject.mockRejectedValueOnce(
        new Error('Client not found')
      )

      const result = await createProjectTool.handler(
        {
          name: 'New Project',
          description: 'Project description',
          clientId: 'non-existent',
          hourlyRate: "75",
        },
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('Error creating project')
      expect(result.content[0].text).toContain('Client not found')
      expect(result.isError).toBe(true)
    })

    it('should validate required parameters', () => {
      expect(createProjectTool.schema.name).toBeDefined()
      expect(createProjectTool.schema.description).toBeDefined()
      expect(createProjectTool.schema.clientId).toBeDefined()
      expect(createProjectTool.schema.hourlyRate).toBeDefined()
    })
  })

  describe('listProjectsTool', () => {
    it('should list all projects successfully', async () => {
      mockProjectService.listProjects.mockResolvedValueOnce(mockProjects)

      const result = await listProjectsTool.handler(
        {},
        'test-user-123'
      )

      expect(mockProjectService.listProjects).toHaveBeenCalledWith('test-user-123', undefined, undefined)

      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
      expect(result.content[0].text).toContain('Available projects:')
      expect(result.content[0].text).toContain('Website Development')
      expect(result.content[0].text).toContain('Mobile App')
    })

    it('should list projects for specific client', async () => {
      const clientProjects = mockProjects.filter(p => p.clientId === 'test-client-1')
      mockProjectService.listProjects.mockResolvedValueOnce(clientProjects)

      const result = await listProjectsTool.handler(
        { clientId: 'test-client-1' },
        'test-user-123'
      )

      expect(mockProjectService.listProjects).toHaveBeenCalledWith('test-user-123', 'test-client-1', undefined)

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('Available projects:')
      expect(result.content[0].text).toContain('Website Development')
    })

    it('should handle no projects found', async () => {
      mockProjectService.listProjects.mockResolvedValueOnce([])

      const result = await listProjectsTool.handler(
        {},
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toBe('No projects found.')
    })

    it('should handle list projects errors', async () => {
      mockProjectService.listProjects.mockRejectedValueOnce(
        new Error('Database error')
      )

      const result = await listProjectsTool.handler(
        {},
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('Error listing projects')
      expect(result.content[0].text).toContain('Database error')
      expect(result.isError).toBe(true)
    })
  })

  describe('updateProjectTool', () => {
    it('should update project successfully', async () => {
      const updatedProject = mockProject({
        id: 'test-project-1',
        name: 'Updated Project Name',
        description: 'Updated description',
        hourlyRate: "85",
      })

      mockProjectService.updateProject.mockResolvedValueOnce(updatedProject)

      const result = await updateProjectTool.handler(
        {
          projectId: 'test-project-1',
          name: 'Updated Project Name',
          description: 'Updated description',
          hourlyRate: "85",
        },
        'test-user-123'
      )

      expect(mockProjectService.updateProject).toHaveBeenCalledWith(
        'test-user-123',
        'test-project-1',
        {
          name: 'Updated Project Name',
          description: 'Updated description',
          hourlyRate: "85",
        }
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('Project updated successfully')
      expect(result.content[0].text).toContain('test-project-1')
      expect(result.content[0].text).toContain('Updated Project Name')
      expect(result.content[0].text).toContain('$85')
    })

    it('should handle project not found', async () => {
      mockProjectService.updateProject.mockResolvedValueOnce(null)

      const result = await updateProjectTool.handler(
        {
          projectId: 'non-existent',
          name: 'Updated Name',
        },
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toBe('Project not found.')
      expect(result.isError).toBe(true)
    })

    it('should handle update errors', async () => {
      mockProjectService.updateProject.mockRejectedValueOnce(
        new Error('Validation error')
      )

      const result = await updateProjectTool.handler(
        {
          projectId: 'test-project-1',
          name: 'Updated Name',
        },
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('Error updating project')
      expect(result.content[0].text).toContain('Validation error')
      expect(result.isError).toBe(true)
    })

    it('should validate required projectId parameter', () => {
      expect(updateProjectTool.schema.projectId).toBeDefined()
    })

    it('should handle optional parameters', () => {
      expect(updateProjectTool.schema.name).toBeDefined()
      expect(updateProjectTool.schema.description).toBeDefined()
      expect(updateProjectTool.schema.hourlyRate).toBeDefined()
    })
  })

  describe('deactivateProjectTool', () => {
    it('should deactivate project successfully', async () => {
      const deactivatedProject = mockProject({
        id: 'test-project-1',
        name: 'Test Project',
        active: false,
      })

      mockProjectService.deactivateProject.mockResolvedValueOnce(deactivatedProject)

      const result = await deactivateProjectTool.handler(
        { projectId: 'test-project-1' },
        'test-user-123'
      )

      expect(mockProjectService.deactivateProject).toHaveBeenCalledWith(
        'test-user-123',
        'test-project-1'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('has been deactivated successfully')
      expect(result.content[0].text).toContain('Test Project')
    })

    it('should handle project not found', async () => {
      mockProjectService.deactivateProject.mockResolvedValueOnce(null)

      const result = await deactivateProjectTool.handler(
        { projectId: 'non-existent' },
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toBe('Project not found.')
      expect(result.isError).toBe(true)
    })

    it('should handle deactivate errors', async () => {
      mockProjectService.deactivateProject.mockRejectedValueOnce(
        new Error('Cannot deactivate project with active time entries')
      )

      const result = await deactivateProjectTool.handler(
        { projectId: 'test-project-1' },
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('Error deactivating project')
      expect(result.content[0].text).toContain('Cannot deactivate project with active time entries')
      expect(result.isError).toBe(true)
    })

    it('should validate required projectId parameter', () => {
      expect(deactivateProjectTool.schema.projectId).toBeDefined()
    })
  })
})