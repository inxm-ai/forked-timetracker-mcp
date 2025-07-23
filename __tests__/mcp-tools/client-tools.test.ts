import { mockClient } from '../utils/test-helpers'
import { mockClients } from '../mocks/mock-data'

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
  clients: {
    id: 'id',
    userId: 'userId',
    name: 'name',
    email: 'email',
    active: 'active',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  },
  projects: {
    id: 'id',
    clientId: 'clientId',
    active: 'active',
  },
}))

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn().mockReturnValue('mock-id'),
}))

// Mock the ClientService
jest.mock('@/lib/services/clients', () => {
  const mockServiceMethods = {
    createClient: jest.fn(),
    listClients: jest.fn(),
    updateClient: jest.fn(),
    deactivateClient: jest.fn(),
  }
  
  return {
    ClientService: jest.fn().mockImplementation(() => mockServiceMethods),
    __mockServiceMethods: mockServiceMethods,
  }
})

// Import the tools after mocking
import {
  createClientTool,
  listClientsTool,
  updateClientTool,
  deactivateClientTool,
} from '@/lib/mcp-tools/client-tools'

// Get the mock service methods for assertions
const mockClientService = (require('@/lib/services/clients') as any).__mockServiceMethods

describe('Client MCP Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createClientTool', () => {
    it('should create client successfully', async () => {
      const newClient = mockClient({
        id: 'new-client-id',
        name: 'New Client',
        description: 'A new client',
      })

      mockClientService.createClient.mockResolvedValueOnce(newClient)

      const result = await createClientTool.handler(
        { name: 'New Client', description: 'A new client' },
        'test-user-123'
      )

      expect(mockClientService.createClient).toHaveBeenCalledWith(
        'test-user-123',
        { name: 'New Client', description: 'A new client' }
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
      expect(result.content[0].text).toContain('Client created successfully')
      expect(result.content[0].text).toContain('new-client-id')
      expect(result.content[0].text).toContain('New Client')
    })

    it('should handle create client errors', async () => {
      mockClientService.createClient.mockRejectedValueOnce(
        new Error('Name already exists')
      )

      const result = await createClientTool.handler(
        { name: 'Existing Client', description: 'Test client' },
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('Error creating client')
      expect(result.content[0].text).toContain('Name already exists')
      expect(result.isError).toBe(true)
    })

    it('should validate required parameters', () => {
      expect(createClientTool.schema.name).toBeDefined()
      expect(createClientTool.schema.description).toBeDefined()
    })
  })

  describe('listClientsTool', () => {
    it('should list clients successfully', async () => {
      mockClientService.listClients.mockResolvedValueOnce(mockClients)

      const result = await listClientsTool.handler(
        {},
        'test-user-123'
      )

      expect(mockClientService.listClients).toHaveBeenCalledWith('test-user-123', undefined)

      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
      expect(result.content[0].text).toContain('Available clients:')
      expect(result.content[0].text).toContain('Acme Corp')
      expect(result.content[0].text).toContain('Tech Solutions')
    })

    it('should handle no clients found', async () => {
      mockClientService.listClients.mockResolvedValueOnce([])

      const result = await listClientsTool.handler(
        {},
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toBe('No clients found.')
    })

    it('should handle list clients errors', async () => {
      mockClientService.listClients.mockRejectedValueOnce(
        new Error('Database error')
      )

      const result = await listClientsTool.handler(
        {},
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('Error listing clients')
      expect(result.content[0].text).toContain('Database error')
      expect(result.isError).toBe(true)
    })
  })

  describe('updateClientTool', () => {
    it('should update client successfully', async () => {
      const updatedClient = mockClient({
        id: 'test-client-1',
        name: 'Updated Client Name',
        email: 'updated@example.com',
      })

      mockClientService.updateClient.mockResolvedValueOnce(updatedClient)

      const result = await updateClientTool.handler(
        {
          clientId: 'test-client-1',
          name: 'Updated Client Name',
          description: 'Updated description',
        },
        'test-user-123'
      )

      expect(mockClientService.updateClient).toHaveBeenCalledWith(
        'test-user-123',
        'test-client-1',
        {
          name: 'Updated Client Name',
          description: 'Updated description',
        }
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('Client updated successfully')
      expect(result.content[0].text).toContain('test-client-1')
      expect(result.content[0].text).toContain('Updated Client Name')
    })

    it('should handle client not found', async () => {
      mockClientService.updateClient.mockResolvedValueOnce(null)

      const result = await updateClientTool.handler(
        {
          clientId: 'non-existent',
          name: 'Updated Name',
        },
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toBe('Client not found.')
      expect(result.isError).toBe(true)
    })

    it('should handle update errors', async () => {
      mockClientService.updateClient.mockRejectedValueOnce(
        new Error('Validation error')
      )

      const result = await updateClientTool.handler(
        {
          clientId: 'test-client-1',
          name: 'Updated Name',
        },
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('Error updating client')
      expect(result.content[0].text).toContain('Validation error')
      expect(result.isError).toBe(true)
    })

    it('should validate required clientId parameter', () => {
      expect(updateClientTool.schema.clientId).toBeDefined()
    })

    it('should handle optional parameters', () => {
      expect(updateClientTool.schema.name).toBeDefined()
      expect(updateClientTool.schema.description).toBeDefined()
      expect(updateClientTool.schema.active).toBeDefined()
    })
  })

  describe('deactivateClientTool', () => {
    it('should deactivate client successfully', async () => {
      const deactivatedClient = mockClient({
        id: 'test-client-1',
        name: 'Test Client',
        active: false,
      })

      mockClientService.deactivateClient.mockResolvedValueOnce(deactivatedClient)

      const result = await deactivateClientTool.handler(
        { clientId: 'test-client-1' },
        'test-user-123'
      )

      expect(mockClientService.deactivateClient).toHaveBeenCalledWith(
        'test-user-123',
        'test-client-1'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('has been deactivated successfully')
      expect(result.content[0].text).toContain('Test Client')
    })

    it('should handle client not found', async () => {
      mockClientService.deactivateClient.mockResolvedValueOnce(null)

      const result = await deactivateClientTool.handler(
        { clientId: 'non-existent' },
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toBe('Client not found.')
      expect(result.isError).toBe(true)
    })

    it('should handle deactivate errors', async () => {
      mockClientService.deactivateClient.mockRejectedValueOnce(
        new Error('Cannot deactivate client with active projects')
      )

      const result = await deactivateClientTool.handler(
        { clientId: 'test-client-1' },
        'test-user-123'
      )

      expect(result.content).toHaveLength(1)
      expect(result.content[0].text).toContain('Error deactivating client')
      expect(result.content[0].text).toContain('Cannot deactivate client with active projects')
      expect(result.isError).toBe(true)
    })

    it('should validate required clientId parameter', () => {
      expect(deactivateClientTool.schema.clientId).toBeDefined()
    })
  })
})