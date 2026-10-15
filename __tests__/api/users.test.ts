import { GET } from '@/app/api/users/route'
import { createMockRequest } from '../utils/test-helpers'

jest.mock('@/lib/authUtils', () => ({
  getAuthenticatedUser: jest.fn(),
}))

// Rows as node-postgres returns them: count(*) is a string.
const userRows = [
  { userId: 'alice', userName: 'Alice', userEmail: 'alice@example.com', userImage: null, entryCount: '3' },
  { userId: 'bob', userName: 'Bob', userEmail: 'bob@example.com', userImage: null, entryCount: '5' },
  { userId: 'carol', userName: 'Carol', userEmail: 'carol@example.com', userImage: null, entryCount: '1' },
]

jest.mock('@/drizzle/connection', () => ({
  db: {
    select: () => ({
      from: () => ({
        leftJoin: () => ({
          groupBy: () => ({
            orderBy: () => Promise.resolve(userRows),
          }),
        }),
      }),
    }),
  },
}))

jest.mock('drizzle-orm', () => ({
  sql: jest.fn(),
  eq: jest.fn(),
  // drizzle/schema declares its relations at import time
  relations: jest.fn(),
}))

const { getAuthenticatedUser } = jest.requireMock<{ getAuthenticatedUser: jest.Mock }>('@/lib/authUtils')

const listUserIds = async (): Promise<string[]> => {
  const response = await GET(createMockRequest('GET', '/api/users'))
  expect(response.status).toBe(200)
  const users: { id: string }[] = await response.json()
  return users.map((user) => user.id)
}

describe('/api/users', () => {
  it('offers a regular user only themselves', async () => {
    getAuthenticatedUser.mockResolvedValueOnce({ userId: 'alice', role: 'user' })

    expect(await listUserIds()).toEqual(['alice'])
  })

  it.each(['hr', 'admin'])('offers %s every user', async (role) => {
    getAuthenticatedUser.mockResolvedValueOnce({ userId: 'alice', role })

    expect(await listUserIds()).toEqual(['alice', 'bob', 'carol'])
  })

  it('returns entry counts as numbers', async () => {
    getAuthenticatedUser.mockResolvedValueOnce({ userId: 'alice', role: 'user' })

    const response = await GET(createMockRequest('GET', '/api/users'))
    const [alice] = await response.json()

    expect(alice.entryCount).toBe(3)
  })

  it('passes the 401 through for unauthenticated requests', async () => {
    getAuthenticatedUser.mockRejectedValueOnce(new Response('Unauthorized', { status: 401 }))

    const response = await GET(createMockRequest('GET', '/api/users'))

    expect(response.status).toBe(401)
  })
})
