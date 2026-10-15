import React from 'react'
import { render, screen } from '@testing-library/react'
import Profile from '@/app/(admin)/profile/page'
import ProfileSettings from '@/app/(admin)/profile/settings/page'

// Proxy mode: Better Auth has no session (get-session returns null).
jest.mock('@/lib/authClient', () => ({
  authClient: {
    useSession: () => ({ data: null, isPending: false }),
  },
}))

const mockUseUnifiedSession = jest.fn()
jest.mock('@/lib/hooks/useUnifiedSession', () => ({
  useUnifiedSession: () => mockUseUnifiedSession(),
}))

// The header pulls in the live timer and user menu, which are not under test.
jest.mock('@/components/navigation/AdminHeader', () => ({
  __esModule: true,
  default: () => <header />,
}))

const proxySession = {
  data: { user: { id: 'alice-id', name: 'alice', email: 'alice@example.com', role: null } },
  isPending: false,
  mode: 'proxy',
}

describe.each([
  ['Profile', Profile],
  ['Security Settings', ProfileSettings],
])('%s page', (title, Page) => {
  it('shows the proxy-authenticated account read-only instead of a blank page', () => {
    mockUseUnifiedSession.mockReturnValue(proxySession)

    render(<Page />)

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText(/managed by your organization's sign-in/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /save|update password|change password/i })).not.toBeInTheDocument()
  })

  it('renders nothing without a Better Auth session outside proxy mode, as before', () => {
    mockUseUnifiedSession.mockReturnValue({ data: null, isPending: false, mode: 'better-auth' })

    const { container } = render(<Page />)

    expect(container).toBeEmptyDOMElement()
  })
})
