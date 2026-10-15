import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EnhancedTimeEntriesList from '@/components/time-entries/EnhancedTimeEntriesList'
import { mockApiResponses } from '../mocks/mock-data'

// Mock SWR with proper implementation
jest.mock('swr', () => ({
  __esModule: true,
  default: jest.fn(),
  mutate: jest.fn(),
}))

const mockMutate = require('swr').mutate

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Signed in as a regular user unless a test says otherwise.
const mockUseUnifiedSession = jest.fn()
jest.mock('@/lib/hooks/useUnifiedSession', () => ({
  useUnifiedSession: () => mockUseUnifiedSession(),
}))
const signInAs = (role: string) =>
  mockUseUnifiedSession.mockReturnValue({
    data: { user: { id: 'test-user-123', role } },
    isPending: false,
    mode: 'proxy',
  })

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Mock date-fns format function
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatString) => {
    if (formatString === 'yyyy-MM-dd') return '2024-01-01'
    if (formatString === 'MMM dd, yyyy • HH:mm') return 'Jan 01, 2024 • 10:00'
    if (formatString === 'HH:mm') return '10:00'
    return '2024-01-01'
  }),
}))

type SWRState = { data: unknown; error: Error | null; isLoading: boolean }

const loaded = (data: unknown): SWRState => ({ data, error: null, isLoading: false })
const EMPTY: SWRState = loaded(null)

describe('EnhancedTimeEntriesList', () => {
  const mockSWR = require('swr').default

  // The component calls useSWR for each key on every render, so answer by key
  // (as SWR does) instead of by call order.
  const mockSWRResponses = (responses: {
    entries?: SWRState
    projects?: SWRState
    users?: SWRState
    active?: SWRState
  }) => {
    mockSWR.mockImplementation((key: string) => {
      if (key === '/api/projects') return responses.projects ?? EMPTY
      if (key === '/api/users') return responses.users ?? EMPTY
      if (key === '/api/time-entries/active') return responses.active ?? EMPTY
      if (key.startsWith('/api/time-entries')) return responses.entries ?? EMPTY
      return EMPTY
    })
  }

  const mockLoadedData = () =>
    mockSWRResponses({
      entries: loaded(mockApiResponses.timeEntries),
      projects: loaded(mockApiResponses.projects),
      users: loaded(mockApiResponses.users),
    })

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    mockMutate.mockClear()
    signInAs('user')
  })

  // Spies on document/window must not leak into later tests.
  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('in dashboard mode', () => {
    beforeEach(() => {
      mockLoadedData()
    })

    it('should render in dashboard mode', () => {
      render(<EnhancedTimeEntriesList mode="dashboard" maxEntries={5} />)
      
      expect(screen.getByText('Recent Time Entries')).toBeInTheDocument()
      expect(screen.getByText('View All Reports')).toBeInTheDocument()
    })

    it('should not show filters in dashboard mode', () => {
      render(<EnhancedTimeEntriesList mode="dashboard" />)
      
      expect(screen.queryByPlaceholderText('Search entries, projects, or clients...')).not.toBeInTheDocument()
    })

    it('should show limited entries in dashboard mode', () => {
      render(<EnhancedTimeEntriesList mode="dashboard" maxEntries={3} />)
      
      // Should show only non-active entries
      const entries = screen.getAllByRole('button', { name: /start/i })
      expect(entries.length).toBeLessThanOrEqual(3)
    })

    it('should handle View All Reports button click', async () => {
      const user = userEvent.setup()
      
      render(<EnhancedTimeEntriesList mode="dashboard" />)
      
      const viewAllButton = screen.getByText('View All Reports')
      await user.click(viewAllButton)

      expect(mockPush).toHaveBeenCalledWith('/reports')
    })
  })

  describe('in full mode', () => {
    beforeEach(() => {
      mockLoadedData()
    })

    it('should render in full mode', () => {
      render(<EnhancedTimeEntriesList mode="full" />)
      
      expect(screen.getByText('Time Entries')).toBeInTheDocument()
      expect(screen.getByText('Export')).toBeInTheDocument()
    })

    it('should show search input in full mode', () => {
      render(<EnhancedTimeEntriesList mode="full" />)
      
      expect(screen.getByPlaceholderText('Search entries, projects, or clients...')).toBeInTheDocument()
    })

    it('should show filters toggle button', () => {
      render(<EnhancedTimeEntriesList mode="full" />)
      
      expect(screen.getByText('Filters')).toBeInTheDocument()
    })

    it('should toggle filters visibility', async () => {
      const user = userEvent.setup()
      
      render(<EnhancedTimeEntriesList mode="full" />)
      
      const filtersButton = screen.getByText('Filters')
      await user.click(filtersButton)

      // Should show filter options
      expect(screen.getByText('Current user only')).toBeInTheDocument()
      expect(screen.getByText('All projects')).toBeInTheDocument()
    })

    it('should handle search input', async () => {
      const user = userEvent.setup()
      
      render(<EnhancedTimeEntriesList mode="full" />)
      
      const searchInput = screen.getByPlaceholderText('Search entries, projects, or clients...')
      await user.type(searchInput, 'test search')

      expect(searchInput).toHaveValue('test search')
    })

    it('should show export button', () => {
      render(<EnhancedTimeEntriesList mode="full" />)
      
      expect(screen.getByText('Export')).toBeInTheDocument()
    })

    it('should handle export functionality', async () => {
      const user = userEvent.setup()
      
      // Hold the export fetch open so the in-progress state can be observed
      let resolveExportFetch: (response: unknown) => void = () => {}
      mockFetch.mockReturnValueOnce(new Promise((resolve) => { resolveExportFetch = resolve }))

      // jsdom has no URL.createObjectURL / revokeObjectURL
      const mockCreateObjectURL = jest.fn().mockReturnValue('blob:url')
      const mockRevokeObjectURL = jest.fn()
      Object.defineProperty(URL, 'createObjectURL', { value: mockCreateObjectURL, configurable: true })
      Object.defineProperty(URL, 'revokeObjectURL', { value: mockRevokeObjectURL, configurable: true })

      render(<EnhancedTimeEntriesList mode="full" />)

      // Capture the download link the component creates; everything else is real DOM.
      const realCreateElement = document.createElement.bind(document)
      const mockLink = realCreateElement('a')
      const mockClick = jest.spyOn(mockLink, 'click').mockImplementation(() => {})
      jest.spyOn(document, 'createElement').mockImplementation(
        (tagName: string, options?: ElementCreationOptions) =>
          tagName === 'a' ? mockLink : realCreateElement(tagName, options)
      )
      
      const exportButton = screen.getByText('Export')
      await user.click(exportButton)

      // Should show loading state
      expect(screen.getByText('Exporting...')).toBeInTheDocument()

      resolveExportFetch({
        ok: true,
        json: async () => mockApiResponses.timeEntries,
      })

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled()
        expect(mockClick).toHaveBeenCalled()
        expect(mockRevokeObjectURL).toHaveBeenCalled()
      })
    })

    it('should not offer "All users" to a regular user', async () => {
      const user = userEvent.setup()

      render(<EnhancedTimeEntriesList mode="full" />)
      await user.click(screen.getByText('Filters'))
      await user.click(screen.getByText('Current user only'))

      expect(screen.queryByText('All users')).not.toBeInTheDocument()
    })

    it('should offer "All users" to roles that may view all timesheets', async () => {
      signInAs('hr')
      const user = userEvent.setup()

      render(<EnhancedTimeEntriesList mode="full" />)
      await user.click(screen.getByText('Filters'))
      await user.click(screen.getByText('Current user only'))

      expect(screen.getByText('All users')).toBeInTheDocument()
    })

    it('should keep the filters usable when loading entries fails', async () => {
      mockSWRResponses({
        entries: { data: undefined, error: new Error('Forbidden'), isLoading: false },
        projects: loaded(mockApiResponses.projects),
        users: loaded(mockApiResponses.users),
      })
      const user = userEvent.setup()

      render(<EnhancedTimeEntriesList mode="full" />)

      expect(screen.getByText('Error loading time entries')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search entries, projects, or clients...')).toBeInTheDocument()
      await user.click(screen.getByText('Filters'))
      expect(screen.getByText('Current user only')).toBeInTheDocument()
    })

    it('should show pagination controls', () => {
      // Pagination renders only with more than one page (10 per page by default)
      mockSWRResponses({
        entries: loaded({ ...mockApiResponses.timeEntries, total: 25 }),
        projects: loaded(mockApiResponses.projects),
        users: loaded(mockApiResponses.users),
      })

      render(<EnhancedTimeEntriesList mode="full" />)
      
      expect(screen.getByText('per page')).toBeInTheDocument()
      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
    })
  })

  describe('timer interactions', () => {
    beforeEach(() => {
      mockLoadedData()
    })

    it('should handle start timer action', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      render(<EnhancedTimeEntriesList mode="full" />)
      
      const startButtons = screen.getAllByRole('button', { name: /start/i })
      await user.click(startButtons[0])

      expect(mockFetch).toHaveBeenCalledWith('/api/time-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.any(String),
      })
      const [, request] = mockFetch.mock.calls[0]
      expect(JSON.parse(request.body)).toEqual({
        projectId: 'test-project-1',
        description: 'Working on homepage',
      })
    })

    it('should listen for timerStopped events', () => {
      const mockAddEventListener = jest.spyOn(window, 'addEventListener')
      const mockRemoveEventListener = jest.spyOn(window, 'removeEventListener')

      const { unmount } = render(<EnhancedTimeEntriesList mode="full" />)
      
      expect(mockAddEventListener).toHaveBeenCalledWith('timerStopped', expect.any(Function))
      
      unmount()
      
      expect(mockRemoveEventListener).toHaveBeenCalledWith('timerStopped', expect.any(Function))
    })
  })

  describe('loading and error states', () => {
    it('should show loading state', () => {
      const loading: SWRState = { data: null, error: null, isLoading: true }
      mockSWRResponses({ entries: loading, projects: loading, users: loading })

      render(<EnhancedTimeEntriesList />)
      
      expect(screen.getByRole('status')).toBeInTheDocument() // Loading spinner
    })

    it('should show error state', () => {
      const failed: SWRState = { data: null, error: new Error('Network error'), isLoading: false }
      mockSWRResponses({ entries: failed, projects: failed, users: failed })

      render(<EnhancedTimeEntriesList />)
      
      expect(screen.getByText('Error loading time entries')).toBeInTheDocument()
    })

    it('should show empty state', () => {
      mockSWRResponses({
        entries: loaded({ entries: [], total: 0 }),
        projects: loaded([]),
        users: loaded([]),
      })

      render(<EnhancedTimeEntriesList />)
      
      expect(screen.getByText('No time entries match your filters')).toBeInTheDocument()
    })
  })

  describe('utility functions', () => {
    it('should format duration correctly', () => {
      mockSWRResponses({
        entries: loaded({
            entries: [{
              id: 'test-1',
              projectId: 'proj-1',
              userId: 'user-1',
              startTime: '2024-01-01T10:00:00Z',
              endTime: '2024-01-01T12:00:00Z',
              projectName: 'Test Project',
              clientName: 'Test Client',
              description: 'Test work',
              durationMinutes: 120,
              isActive: false,
            }],
            total: 1,
          }),
        projects: loaded(mockApiResponses.projects),
        users: loaded(mockApiResponses.users),
      })

      render(<EnhancedTimeEntriesList />)
      
      expect(screen.getByText('2h 0m')).toBeInTheDocument()
    })
  })
})