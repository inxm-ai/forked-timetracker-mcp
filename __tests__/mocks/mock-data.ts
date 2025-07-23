export const mockUsers = [
  {
    id: 'test-user-123',
    name: 'Test User',
    email: 'test@example.com',
    image: null,
    entryCount: 5,
  },
  {
    id: 'test-user-456',
    name: 'Jane Doe',
    email: 'jane@example.com',
    image: 'https://example.com/jane.jpg',
    entryCount: 3,
  },
]

export const mockClients = [
  {
    id: 'test-client-1',
    name: 'Acme Corp',
    email: 'contact@acme.com',
    userId: 'test-user-123',
    active: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 'test-client-2',
    name: 'Tech Solutions',
    email: 'hello@techsolutions.com',
    userId: 'test-user-123',
    active: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
]

export const mockProjects = [
  {
    id: 'test-project-1',
    name: 'Website Development',
    description: 'Building a new website',
    clientId: 'test-client-1',
    userId: 'test-user-123',
    hourlyRate: 75,
    active: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
  {
    id: 'test-project-2',
    name: 'Mobile App',
    description: 'React Native mobile app',
    clientId: 'test-client-2',
    userId: 'test-user-123',
    hourlyRate: 85,
    active: true,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
]

export const mockTimeEntries = [
  {
    id: 'test-entry-1',
    userId: 'test-user-123',
    projectId: 'test-project-1',
    description: 'Working on homepage',
    startTime: new Date('2024-01-01T09:00:00Z'),
    endTime: new Date('2024-01-01T10:30:00Z'),
    durationMinutes: 90,
    isActive: false,
    createdAt: new Date('2024-01-01T09:00:00Z'),
    updatedAt: new Date('2024-01-01T10:30:00Z'),
  },
  {
    id: 'test-entry-2',
    userId: 'test-user-123',
    projectId: 'test-project-1',
    description: 'Fixing bugs',
    startTime: new Date('2024-01-01T14:00:00Z'),
    endTime: new Date('2024-01-01T16:00:00Z'),
    durationMinutes: 120,
    isActive: false,
    createdAt: new Date('2024-01-01T14:00:00Z'),
    updatedAt: new Date('2024-01-01T16:00:00Z'),
  },
  {
    id: 'test-entry-3',
    userId: 'test-user-123',
    projectId: 'test-project-2',
    description: 'Current work session',
    startTime: new Date('2024-01-02T10:00:00Z'),
    endTime: null,
    durationMinutes: null,
    isActive: true,
    createdAt: new Date('2024-01-02T10:00:00Z'),
    updatedAt: new Date('2024-01-02T10:00:00Z'),
  },
]

export const mockTimeEntriesWithDetails = mockTimeEntries.map(entry => ({
  ...entry,
  projectName: mockProjects.find(p => p.id === entry.projectId)?.name || 'Unknown Project',
  clientName: mockClients.find(c => c.id === mockProjects.find(p => p.id === entry.projectId)?.clientId)?.name || 'Unknown Client',
}))

export const mockActiveTimeEntry = mockTimeEntries.find(entry => entry.isActive)

export const mockInactiveTimeEntries = mockTimeEntries.filter(entry => !entry.isActive)

export const mockApiResponses = {
  timeEntries: {
    entries: mockTimeEntriesWithDetails,
    total: mockTimeEntriesWithDetails.length,
  },
  projects: mockProjects.map(project => ({
    ...project,
    clientName: mockClients.find(c => c.id === project.clientId)?.name || 'Unknown Client',
  })),
  users: mockUsers,
  activeEntry: mockActiveTimeEntry,
}