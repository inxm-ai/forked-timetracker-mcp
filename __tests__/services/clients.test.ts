import { ClientService } from '@/lib/services/clients'
import { mockTimeEntry, mockClient } from '../utils/test-helpers'

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
    from: () => ({ ...mockDb, innerJoin: () => ({ ...mockDb, where: () => ({ ...mockDb, limit: () => Promise.resolve(rows) }) }) }),
  }))
}

const resolveUpdate = (row: unknown) => {
  mockDb.update.mockImplementation(() => mockDb)
  mockDb.set.mockImplementation(() => mockDb)
  mockDb.where.mockImplementation(() => mockDb)
  mockDb.returning.mockImplementation(() => Promise.resolve([row]))
}

describe('ClientService deactivation guard', () => {
  let service: ClientService

  beforeEach(() => {
    service = new ClientService()
    jest.clearAllMocks()
  })

  // deactivate_client refuses when time has been tracked; update_client with
  // active: false must not be a way around that.
  it('refuses to deactivate through updateClient when time has been tracked', async () => {
    resolveTrackedTimeOnce([mockTimeEntry()])
    resolveUpdate(mockClient({ id: 'client-1', active: false }))

    await expect(service.updateClient('user-1', 'client-1', { active: false })).rejects.toThrow(
      'Cannot deactivate client that has tracked time entries'
    )
    expect(mockDb.update).not.toHaveBeenCalled()
  })

  it('deactivates through updateClient when no time has been tracked', async () => {
    resolveTrackedTimeOnce([])
    resolveUpdate(mockClient({ id: 'client-1', active: false }))

    const result = await service.updateClient('user-1', 'client-1', { active: false })

    expect(result?.active).toBe(false)
  })

  it('does not look up tracked time for other updates', async () => {
    resolveUpdate(mockClient({ id: 'client-1', description: 'renamed' }))

    const result = await service.updateClient('user-1', 'client-1', { description: 'renamed' })

    expect(result?.description).toBe('renamed')
    expect(mockDb.select).not.toHaveBeenCalled()
  })

  it('still refuses deactivateClient when time has been tracked', async () => {
    resolveTrackedTimeOnce([mockTimeEntry()])
    resolveUpdate(mockClient({ id: 'client-1', active: false }))

    await expect(service.deactivateClient('user-1', 'client-1')).rejects.toThrow('Cannot deactivate client that has tracked time entries')
    expect(mockDb.update).not.toHaveBeenCalled()
  })
})
