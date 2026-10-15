import { z } from 'zod'

jest.mock('@/lib/services/time-entries', () => {
  const mockServiceMethods = {
    getTimeSummary: jest.fn(),
  }

  return {
    TimeEntryService: jest.fn().mockImplementation(() => mockServiceMethods),
    __mockServiceMethods: mockServiceMethods,
  }
})

// Import the tools after mocking
import { getTimeSummaryTool } from '@/lib/mcp-tools/report-tools'

const { __mockServiceMethods: mockTimeEntryService } = jest.requireMock<{
  __mockServiceMethods: { getTimeSummary: jest.Mock }
}>('@/lib/services/time-entries')

describe('getTimeSummaryTool', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns numeric hours and entry counts when Postgres returns the aggregates as strings', async () => {
    // node-postgres returns numeric and bigint aggregates (round(sum()), count(*)) as strings.
    mockTimeEntryService.getTimeSummary.mockResolvedValue([
      { clientName: 'Acme', projectName: 'Website', totalMinutes: '90', totalHours: '1.50', entryCount: '2' },
    ])

    const result = await getTimeSummaryTool.handler({}, 'user-1')

    expect(result.isError).toBeUndefined()
    expect(result.structuredContent?.items).toEqual([
      { clientName: 'Acme', projectName: 'Website', totalHours: 1.5, entryCount: 2 },
    ])
    expect(result.structuredContent?.totalHours).toBe(1.5)
    expect(result.structuredContent?.totalEntries).toBe(2)
    // The MCP server validates structured content against this schema before returning it.
    expect(() => z.object(getTimeSummaryTool.outputSchema).parse(result.structuredContent)).not.toThrow()
  })
})
