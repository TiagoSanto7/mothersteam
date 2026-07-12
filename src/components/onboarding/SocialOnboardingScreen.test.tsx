import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SocialOnboardingScreen } from './SocialOnboardingScreen'
import { useAppStore } from '../../store/useAppStore'
import type { ApiCommunity, ApiFollowUser, PaginatedResult } from '../../lib/types'

// ---------------------------------------------------------------------------
// Mock apiFetch
// ---------------------------------------------------------------------------
const mockApiFetch = vi.fn()

vi.mock('../../lib/api', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  ApiError: class extends Error {},
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const COMMUNITIES: ApiCommunity[] = [
  {
    id: 'c1',
    name: 'Amamentação com Apoio',
    description: 'Dúvidas da amamentação.',
    category: 'amamentação',
    colorKey: 'warm',
    creatorId: 'u0',
    _count: { members: 100 },
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'c2',
    name: 'Pós-parto Real',
    description: 'O quarto trimestre.',
    category: 'pós-parto',
    colorKey: 'linen',
    creatorId: 'u0',
    _count: { members: 200 },
    createdAt: '2024-01-01T00:00:00Z',
  },
]

const USERS: ApiFollowUser[] = [
  { id: 'u2', name: 'Ana Souza', isFollowedByCurrentUser: false, isSelf: false },
  { id: 'u3', name: 'Bia Lima',  isFollowedByCurrentUser: false, isSelf: false },
]

const USERS_PAGINATED: PaginatedResult<ApiFollowUser> = {
  items: USERS,
  hasMore: false,
}

// ---------------------------------------------------------------------------
// Helper: build a wrapper with pre-seeded query cache
// ---------------------------------------------------------------------------
function makeWrapper(
  communities: ApiCommunity[] = COMMUNITIES,
  users: PaginatedResult<ApiFollowUser> = USERS_PAGINATED,
) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    qc.setQueryData(['communities', 'suggested'], communities)
    qc.setQueryData(['users', 'suggested'], users)
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks()
  // Default mock: return appropriate shape depending on the path called.
  // Community and user queries return list/paginated data; mutations return ok.
  mockApiFetch.mockImplementation((path: string) => {
    if (path === '/communities/suggested') return Promise.resolve(COMMUNITIES)
    if (path.startsWith('/users?')) return Promise.resolve(USERS_PAGINATED)
    // mutations (/communities/:id/join, /users/:id/follow)
    return Promise.resolve({ ok: true })
  })
  // Set logged-in state with a known userId that differs from fixture users
  useAppStore.setState({
    isLoggedIn: true,
    currentUserId: 'u1',
    accessToken: 'tok',
  })
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('SocialOnboardingScreen', () => {
  it('renders the title "Conecte-se"', () => {
    render(<SocialOnboardingScreen onDone={vi.fn()} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Conecte-se')).toBeInTheDocument()
  })

  it('renders the "Continuar" button', () => {
    render(<SocialOnboardingScreen onDone={vi.fn()} />, { wrapper: makeWrapper() })
    expect(
      screen.getByRole('button', { name: /continuar/i }),
    ).toBeInTheDocument()
  })

  it('clicking "Continuar" calls onDone', () => {
    const onDone = vi.fn()
    render(<SocialOnboardingScreen onDone={onDone} />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('clicking "Continuar" calls completeSocialOnboarding on the store', () => {
    const spy = vi.fn()
    useAppStore.setState({ completeSocialOnboarding: spy })
    render(<SocialOnboardingScreen onDone={vi.fn()} />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /continuar/i }))
    expect(spy).toHaveBeenCalledOnce()
  })

  it('shows suggested communities when data is available', () => {
    render(<SocialOnboardingScreen onDone={vi.fn()} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Amamentação com Apoio')).toBeInTheDocument()
    expect(screen.getByText('Pós-parto Real')).toBeInTheDocument()
  })

  it('renders "Entrar" button for each community', () => {
    render(<SocialOnboardingScreen onDone={vi.fn()} />, { wrapper: makeWrapper() })
    const entrarButtons = screen.getAllByRole('button', { name: /^entrar em/i })
    expect(entrarButtons).toHaveLength(COMMUNITIES.length)
  })

  it('clicking "Entrar" on a community calls apiFetch POST /communities/:id/join', async () => {
    render(<SocialOnboardingScreen onDone={vi.fn()} />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /entrar em amamentação com apoio/i }))
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/communities/c1/join', { method: 'POST' })
    })
  })

  it('button changes to "Membro" after joining a community', async () => {
    render(<SocialOnboardingScreen onDone={vi.fn()} />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /entrar em amamentação com apoio/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /membro de amamentação com apoio/i })).toBeInTheDocument()
    })
  })

  it('shows suggested users when data is available', () => {
    render(<SocialOnboardingScreen onDone={vi.fn()} />, { wrapper: makeWrapper() })
    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
    expect(screen.getByText('Bia Lima')).toBeInTheDocument()
  })

  it('renders "Seguir" button for each suggested user', () => {
    render(<SocialOnboardingScreen onDone={vi.fn()} />, { wrapper: makeWrapper() })
    const seguirButtons = screen.getAllByRole('button', { name: /^seguir /i })
    expect(seguirButtons).toHaveLength(USERS.length)
  })

  it('clicking "Seguir" on a user calls apiFetch POST /users/:id/follow', async () => {
    render(<SocialOnboardingScreen onDone={vi.fn()} />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /^seguir ana souza$/i }))
    await waitFor(() => {
      expect(mockApiFetch).toHaveBeenCalledWith('/users/u2/follow', { method: 'POST' })
    })
  })

  it('button changes to "Seguindo" after following a user', async () => {
    render(<SocialOnboardingScreen onDone={vi.fn()} />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /^seguir ana souza$/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /seguindo ana souza/i })).toBeInTheDocument()
    })
  })

  it('filters out the current user from suggested users list', () => {
    // Add the current user (u1) to the suggested list
    const usersWithSelf: PaginatedResult<ApiFollowUser> = {
      items: [
        { id: 'u1', name: 'Me Myself', isFollowedByCurrentUser: false, isSelf: true },
        ...USERS,
      ],
      hasMore: false,
    }
    render(<SocialOnboardingScreen onDone={vi.fn()} />, {
      wrapper: makeWrapper(COMMUNITIES, usersWithSelf),
    })
    expect(screen.queryByText('Me Myself')).not.toBeInTheDocument()
    expect(screen.getByText('Ana Souza')).toBeInTheDocument()
  })

  it('filters out already-followed users from the suggested list', () => {
    const usersWithFollowed: PaginatedResult<ApiFollowUser> = {
      items: [
        { id: 'u2', name: 'Ana Souza', isFollowedByCurrentUser: true, isSelf: false },
        { id: 'u3', name: 'Bia Lima',  isFollowedByCurrentUser: false, isSelf: false },
      ],
      hasMore: false,
    }
    render(<SocialOnboardingScreen onDone={vi.fn()} />, {
      wrapper: makeWrapper(COMMUNITIES, usersWithFollowed),
    })
    expect(screen.queryByText('Ana Souza')).not.toBeInTheDocument()
    expect(screen.getByText('Bia Lima')).toBeInTheDocument()
  })

  it('does not render community section when list is empty', () => {
    render(<SocialOnboardingScreen onDone={vi.fn()} />, { wrapper: makeWrapper([]) })
    expect(screen.queryByText(/comunidades sugeridas/i)).not.toBeInTheDocument()
  })

  it('does not render users section when list is empty', () => {
    render(<SocialOnboardingScreen onDone={vi.fn()} />, {
      wrapper: makeWrapper(COMMUNITIES, { items: [], hasMore: false }),
    })
    expect(screen.queryByText(/pessoas para seguir/i)).not.toBeInTheDocument()
  })
})
