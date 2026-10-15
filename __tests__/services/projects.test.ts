import { ProjectService } from '@/lib/services/projects'
import { mockTimeEntry, mockProject } from '../utils/test-helpers'

jest.mock('@/drizzle/connection', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    returning: jest.fn().mockReturnThis(),
  },
}))

const mockDb = require('@/drizzle/connection').db

jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
  and: jest.fn(),
  // drizzle/schema declares its relations at import time
  relations: jest.fn(),
}))

jest.mock('nanoid', () => ({
  nanoid: jest.fn().mockReturnValue('test-generated-id'),
}))

// The tracked-time lookup that guards deactivation.
const resolveTrackedTimeOnce = (rows: unknown[]) => {
  mockDb.select.mockImplementationOnce(() => ({
    ...mockDb,
    from: () => ({ ...mockDb, where: () => ({ ...mockDb, limit: () => Promise.resolve(rows) }) }),
  }))
}

const resolveUpdate = (row: unknown) => {
  mockDb.update.mockImplementation(() => mockDb)
  mockDb.set.mockImplementation(() => mockDb)
  mockDb.where.mockImplementation(() => mockDb)
  mockDb.returning.mockImplementation(() => Promise.resolve([row]))
}

describe('ProjectService deactivation guard', () => {
  let service: ProjectService

  beforeEach(() => {
    service = new ProjectService()
    jest.clearAllMocks()
  })

  // deactivate_project refuses when time has been tracked; update_project with
  // active: false must not be a way around that.
  it('refuses to deactivate through updateProject when time has been tracked', async () => {
    resolveTrackedTimeOnce([mockTimeEntry()])
    resolveUpdate(mockProject({ id: 'project-1', active: false }))

    await expect(service.updateProject('user-1', 'project-1', { active: false })).rejects.toThrow(
      'Cannot deactivate project that has tracked time entries'
    )
    expect(mockDb.update).not.toHaveBeenCalled()
  })

  it('deactivates through updateProject when no time has been tracked', async () => {
    resolveTrackedTimeOnce([])
    resolveUpdate(mockProject({ id: 'project-1', active: false }))

    const result = await service.updateProject('user-1', 'project-1', { active: false })

    expect(result?.active).toBe(false)
  })

  it('does not look up tracked time for other updates', async () => {
    resolveUpdate(mockProject({ id: 'project-1', description: 'renamed' }))

    const result = await service.updateProject('user-1', 'project-1', { description: 'renamed' })

    expect(result?.description).toBe('renamed')
    expect(mockDb.select).not.toHaveBeenCalled()
  })

  it('still refuses deactivateProject when time has been tracked', async () => {
    resolveTrackedTimeOnce([mockTimeEntry()])
    resolveUpdate(mockProject({ id: 'project-1', active: false }))

    await expect(service.deactivateProject('user-1', 'project-1')).rejects.toThrow('Cannot deactivate project that has tracked time entries')
    expect(mockDb.update).not.toHaveBeenCalled()
  })
})
