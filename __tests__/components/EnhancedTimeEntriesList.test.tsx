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

// Mock URL constructor
global.URL = class MockURL {
  searchParams: URLSearchParams
  constructor(url: string) {
    this.searchParams = new URLSearchParams()
  }
} as any

describe('EnhancedTimeEntriesList', () => {
  const mockSWR = require('swr').default

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    mockMutate.mockClear()
  })

  describe('in dashboard mode', () => {
    beforeEach(() => {
      // Mock SWR calls for dashboard mode
      mockSWR
        .mockReturnValueOnce({
          data: mockApiResponses.timeEntries,
          error: null,
          isLoading: false,
        })
        .mockReturnValueOnce({
          data: mockApiResponses.projects,
          error: null,
          isLoading: false,
        })
        .mockReturnValueOnce({
          data: mockApiResponses.users,
          error: null,
          isLoading: false,
        })
        .mockReturnValueOnce({
          data: null,
          error: null,
          isLoading: false,
        })
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
      
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      })

      render(<EnhancedTimeEntriesList mode="dashboard" />)
      
      const viewAllButton = screen.getByText('View All Reports')
      await user.click(viewAllButton)

      expect(window.location.href).toBe('/reports')
    })
  })

  describe('in full mode', () => {
    beforeEach(() => {
      // Mock SWR calls for full mode
      mockSWR
        .mockReturnValueOnce({
          data: mockApiResponses.timeEntries,
          error: null,
          isLoading: false,
        })
        .mockReturnValueOnce({
          data: mockApiResponses.projects,
          error: null,
          isLoading: false,
        })
        .mockReturnValueOnce({
          data: mockApiResponses.users,
          error: null,
          isLoading: false,
        })
        .mockReturnValueOnce({
          data: null,
          error: null,
          isLoading: false,
        })
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
      
      // Mock fetch for export
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.timeEntries,
      })

      // Mock URL.createObjectURL and document.createElement
      const mockCreateObjectURL = jest.fn().mockReturnValue('blob:url')
      const mockRevokeObjectURL = jest.fn()
      global.URL.createObjectURL = mockCreateObjectURL
      global.URL.revokeObjectURL = mockRevokeObjectURL

      const mockLink = {
        setAttribute: jest.fn(),
        style: { visibility: '' },
        click: jest.fn(),
      }
      const mockCreateElement = jest.fn().mockReturnValue(mockLink)
      const mockAppendChild = jest.fn()
      const mockRemoveChild = jest.fn()
      
      Object.defineProperty(document, 'createElement', {
        value: mockCreateElement,
        writable: true,
      })
      Object.defineProperty(document.body, 'appendChild', {
        value: mockAppendChild,
        writable: true,
      })
      Object.defineProperty(document.body, 'removeChild', {
        value: mockRemoveChild,
        writable: true,
      })

      render(<EnhancedTimeEntriesList mode="full" />)
      
      const exportButton = screen.getByText('Export')
      await user.click(exportButton)

      // Should show loading state
      expect(screen.getByText('Exporting...')).toBeInTheDocument()

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled()
        expect(mockLink.click).toHaveBeenCalled()
        expect(mockRevokeObjectURL).toHaveBeenCalled()
      })
    })

    it('should show pagination controls', () => {
      render(<EnhancedTimeEntriesList mode="full" />)
      
      expect(screen.getByText('per page')).toBeInTheDocument()
      expect(screen.getByText('Previous')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
    })
  })

  describe('timer interactions', () => {
    beforeEach(() => {
      mockSWR
        .mockReturnValueOnce({
          data: mockApiResponses.timeEntries,
          error: null,
          isLoading: false,
        })
        .mockReturnValueOnce({
          data: mockApiResponses.projects,
          error: null,
          isLoading: false,
        })
        .mockReturnValueOnce({
          data: mockApiResponses.users,
          error: null,
          isLoading: false,
        })
        .mockReturnValueOnce({
          data: null,
          error: null,
          isLoading: false,
        })
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
        body: JSON.stringify({
          projectId: expect.any(String),
          description: expect.any(String),
        }),
      })
    })

    it('should listen for timerStopped events', () => {
      const mockAddEventListener = jest.fn()
      const mockRemoveEventListener = jest.fn()
      
      Object.defineProperty(window, 'addEventListener', {
        value: mockAddEventListener,
        writable: true,
      })
      Object.defineProperty(window, 'removeEventListener', {
        value: mockRemoveEventListener,
        writable: true,
      })

      const { unmount } = render(<EnhancedTimeEntriesList mode="full" />)
      
      expect(mockAddEventListener).toHaveBeenCalledWith('timerStopped', expect.any(Function))
      
      unmount()
      
      expect(mockRemoveEventListener).toHaveBeenCalledWith('timerStopped', expect.any(Function))
    })
  })

  describe('loading and error states', () => {
    it('should show loading state', () => {
      mockSWR
        .mockReturnValueOnce({
          data: null,
          error: null,
          isLoading: true,
        })
        .mockReturnValueOnce({
          data: null,
          error: null,
          isLoading: true,
        })
        .mockReturnValueOnce({
          data: null,
          error: null,
          isLoading: true,
        })

      render(<EnhancedTimeEntriesList />)
      
      expect(screen.getByRole('status')).toBeInTheDocument() // Loading spinner
    })

    it('should show error state', () => {
      mockSWR
        .mockReturnValueOnce({
          data: null,
          error: new Error('Network error'),
          isLoading: false,
        })
        .mockReturnValueOnce({
          data: null,
          error: new Error('Network error'),
          isLoading: false,
        })
        .mockReturnValueOnce({
          data: null,
          error: new Error('Network error'),
          isLoading: false,
        })

      render(<EnhancedTimeEntriesList />)
      
      expect(screen.getByText('Error loading time entries')).toBeInTheDocument()
    })

    it('should show empty state', () => {
      mockSWR
        .mockReturnValueOnce({
          data: { entries: [], total: 0 },
          error: null,
          isLoading: false,
        })
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
        })
        .mockReturnValueOnce({
          data: [],
          error: null,
          isLoading: false,
        })
        .mockReturnValueOnce({
          data: null,
          error: null,
          isLoading: false,
        })

      render(<EnhancedTimeEntriesList />)
      
      expect(screen.getByText('No time entries match your filters')).toBeInTheDocument()
    })
  })

  describe('utility functions', () => {
    it('should format duration correctly', () => {
      mockSWR
        .mockReturnValueOnce({
          data: {
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
          },
          error: null,
          isLoading: false,
        })
        .mockReturnValueOnce({
          data: mockApiResponses.projects,
          error: null,
          isLoading: false,
        })
        .mockReturnValueOnce({
          data: mockApiResponses.users,
          error: null,
          isLoading: false,
        })
        .mockReturnValueOnce({
          data: null,
          error: null,
          isLoading: false,
        })

      render(<EnhancedTimeEntriesList />)
      
      expect(screen.getByText('2h 0m')).toBeInTheDocument()
    })
  })
})