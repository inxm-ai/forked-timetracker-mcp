import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ActiveTimer from '@/components/dashboard/ActiveTimer'
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

// Mock StartTimer component
jest.mock('@/components/dashboard/StartTimer', () => {
  return function StartTimer({ mode }: { mode?: string }) {
    return <div data-testid="start-timer">Start Timer Component ({mode})</div>
  }
})

// Mock window.dispatchEvent
const mockDispatchEvent = jest.fn()
Object.defineProperty(window, 'dispatchEvent', {
  writable: true,
  value: mockDispatchEvent,
})

describe('ActiveTimer', () => {
  const mockSWR = require('swr').default

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
    mockMutate.mockClear()
    mockDispatchEvent.mockClear()
  })

  describe('when no active timer exists', () => {
    beforeEach(() => {
      mockSWR.mockReturnValue({
        data: null,
        error: null,
        isLoading: false,
      })
    })

    it('should render StartTimer component', () => {
      render(<ActiveTimer />)
      expect(screen.getByTestId('start-timer')).toBeInTheDocument()
    })

    it('should pass mode prop to StartTimer', () => {
      render(<ActiveTimer mode="standalone" />)
      expect(screen.getByText('Start Timer Component (standalone)')).toBeInTheDocument()
    })
  })

  describe('when active timer exists', () => {
    const mockActiveEntry = {
      id: 'test-entry-1',
      projectName: 'Test Project',
      description: 'Working on features',
      startTime: new Date('2024-01-01T10:00:00Z').toISOString(),
      isActive: true,
    }

    beforeEach(() => {
      mockSWR.mockReturnValue({
        data: mockActiveEntry,
        error: null,
        isLoading: false,
      })
    })

    it('should render active timer display', () => {
      render(<ActiveTimer />)
      
      expect(screen.getByText('Test Project')).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('should display elapsed time', () => {
      // Mock current time to be 1 hour after start
      const mockNow = new Date('2024-01-01T11:00:00Z')
      jest.spyOn(Date, 'now').mockReturnValue(mockNow.getTime())

      render(<ActiveTimer />)
      
      // Wait for the timer to update
      waitFor(() => {
        expect(screen.getByText('01:00:00')).toBeInTheDocument()
      })
    })

    it('should update elapsed time every second', async () => {
      jest.useFakeTimers()
      
      const mockNow = new Date('2024-01-01T10:30:00Z')
      jest.spyOn(Date, 'now').mockReturnValue(mockNow.getTime())

      render(<ActiveTimer />)
      
      // Initial time should be 30 minutes
      expect(screen.getByText('00:30:00')).toBeInTheDocument()
      
      // Advance time by 1 second
      jest.advanceTimersByTime(1000)
      
      await waitFor(() => {
        expect(screen.getByText('00:30:01')).toBeInTheDocument()
      })
      
      jest.useRealTimers()
    })

    it('should handle stop timer action', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      render(<ActiveTimer />)
      
      const stopButton = screen.getByRole('button')
      await user.click(stopButton)

      expect(mockFetch).toHaveBeenCalledWith('/api/time-entries/active', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'stop' }),
      })
    })

    it('should refresh data after stopping timer', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      render(<ActiveTimer />)
      
      const stopButton = screen.getByRole('button')
      await user.click(stopButton)

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith('/api/time-entries/active')
      })
    })

    it('should dispatch timerStopped event after stopping', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })

      render(<ActiveTimer />)
      
      const stopButton = screen.getByRole('button')
      await user.click(stopButton)

      await waitFor(() => {
        expect(mockDispatchEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'timerStopped',
            detail: { entryId: 'test-entry-1' },
          })
        )
      })
    })

    it('should disable stop button while loading', async () => {
      const user = userEvent.setup()
      
      // Mock a slow response
      mockFetch.mockReturnValueOnce(
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({}),
        }), 100))
      )

      render(<ActiveTimer />)
      
      const stopButton = screen.getByRole('button')
      await user.click(stopButton)

      expect(stopButton).toBeDisabled()
    })

    it('should handle stop timer errors', async () => {
      const user = userEvent.setup()
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      render(<ActiveTimer />)
      
      const stopButton = screen.getByRole('button')
      await user.click(stopButton)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Error stopping timer:',
          expect.any(Error)
        )
      })
      
      consoleSpy.mockRestore()
    })
  })

  describe('when there is an error', () => {
    beforeEach(() => {
      mockSWR.mockReturnValue({
        data: null,
        error: new Error('Network error'),
        isLoading: false,
      })
    })

    it('should render error state', () => {
      render(<ActiveTimer />)
      
      expect(screen.getByText('Timer Error')).toBeInTheDocument()
    })

    it('should show error styling', () => {
      render(<ActiveTimer />)
      
      const errorContainer = screen.getByText('Timer Error').closest('div')
      expect(errorContainer).toHaveClass('bg-red-50', 'border-red-200')
    })
  })

  describe('formatTime utility', () => {
    beforeEach(() => {
      mockSWR.mockReturnValue({
        data: {
          id: 'test-entry-1',
          projectName: 'Test Project',
          description: 'Working on features',
          startTime: new Date('2024-01-01T10:00:00Z').toISOString(),
          isActive: true,
        },
        error: null,
        isLoading: false,
      })
    })

    it('should format seconds correctly', () => {
      const mockNow = new Date('2024-01-01T10:01:30Z') // 1 minute 30 seconds
      jest.spyOn(Date, 'now').mockReturnValue(mockNow.getTime())

      render(<ActiveTimer />)
      
      expect(screen.getByText('00:01:30')).toBeInTheDocument()
    })

    it('should format hours correctly', () => {
      const mockNow = new Date('2024-01-01T12:30:15Z') // 2 hours 30 minutes 15 seconds
      jest.spyOn(Date, 'now').mockReturnValue(mockNow.getTime())

      render(<ActiveTimer />)
      
      expect(screen.getByText('02:30:15')).toBeInTheDocument()
    })

    it('should pad single digits with zeros', () => {
      const mockNow = new Date('2024-01-01T10:05:07Z') // 5 minutes 7 seconds
      jest.spyOn(Date, 'now').mockReturnValue(mockNow.getTime())

      render(<ActiveTimer />)
      
      expect(screen.getByText('00:05:07')).toBeInTheDocument()
    })
  })
})