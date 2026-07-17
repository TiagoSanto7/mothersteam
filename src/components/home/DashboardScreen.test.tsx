// src/components/home/DashboardScreen.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardScreen, formatPhase, relativeTimeFeed } from './DashboardScreen'
import { useAppStore } from '../../store/useAppStore'
import type { ApiRoutineEntry, ApiBabyEntry } from '../../lib/types'
import type { PregnancyPhase } from '../../types'

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }))
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }))

const ROUTINE_ENTRY: ApiRoutineEntry = {
  id: '1', title: 'Pediatra', time: '23:59', date: new Date().toISOString().split('T')[0],
  category: 'appointment', done: false, userId: 'u1', createdAt: new Date().toISOString(),
}

const FEED_ENTRY: ApiBabyEntry = {
  id: '1', time: '10:00', type: 'feed', detail: 'Esquerdo',
  userId: 'u1', createdAt: new Date(Date.now() - 80 * 60_000).toISOString(),
}

function makeWrapper(
  routineItems: ApiRoutineEntry[] = [],
  babyEntries: ApiBabyEntry[] = [],
) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const today = new Date().toISOString().split('T')[0]
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    qc.setQueryData(['routine', today], routineItems)
    qc.setQueryData(['baby'], babyEntries)
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

beforeEach(() => {
  useAppStore.setState({
    isLoggedIn: true,
    motherName: 'Ana',
    phase: { stage: 'postpartum', ageInDays: 132 } as PregnancyPhase,
    lastFeedSide: 'left',
  })
  mockApiFetch.mockResolvedValue([])
})

// ── Pure helper unit tests ──────────────────────────────────────────────────

describe('formatPhase', () => {
  it('formats pregnant phase', () => {
    expect(formatPhase({ stage: 'pregnant', week: 20 })).toBe('Grávida · semana 20')
  })

  it('formats postpartum with months and days', () => {
    expect(formatPhase({ stage: 'postpartum', ageInDays: 132 })).toBe('Bebê · 4 meses e 12 dias')
  })

  it('formats postpartum with only months when days is 0', () => {
    expect(formatPhase({ stage: 'postpartum', ageInDays: 60 })).toBe('Bebê · 2 meses')
  })

  it('formats postpartum with only days when less than 30', () => {
    expect(formatPhase({ stage: 'postpartum', ageInDays: 10 })).toBe('Bebê · 10 dias')
  })
})

describe('relativeTimeFeed', () => {
  it('returns "agora" for less than 1 minute ago', () => {
    expect(relativeTimeFeed(new Date(Date.now() - 30_000).toISOString())).toBe('agora')
  })

  it('returns minutes only when less than an hour', () => {
    expect(relativeTimeFeed(new Date(Date.now() - 45 * 60_000).toISOString())).toBe('há 45min')
  })

  it('returns hours and minutes combined', () => {
    expect(relativeTimeFeed(new Date(Date.now() - 80 * 60_000).toISOString())).toBe('há 1h20')
  })

  it('returns hours only when minutes is 0', () => {
    expect(relativeTimeFeed(new Date(Date.now() - 120 * 60_000).toISOString())).toBe('há 2h')
  })
})

// ── Component integration tests ─────────────────────────────────────────────

describe('DashboardScreen', () => {
  it('shows mother name in greeting', () => {
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    expect(screen.getByText(/Ana/)).toBeInTheDocument()
  })

  it('shows phase badge', () => {
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    expect(screen.getByText('Bebê · 4 meses e 12 dias')).toBeInTheDocument()
  })

  it('shows Sara card', () => {
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    expect(screen.getByText(/Sara diz/i)).toBeInTheDocument()
  })

  it('shows empty state when no routine items', () => {
    render(<DashboardScreen />, { wrapper: makeWrapper([]) })
    expect(screen.getByText('Nenhum compromisso hoje')).toBeInTheDocument()
  })

  it('shows next appointment title when available', () => {
    render(<DashboardScreen />, { wrapper: makeWrapper([ROUTINE_ENTRY]) })
    expect(screen.getByText('Pediatra')).toBeInTheDocument()
  })

  it('shows empty state when no feed entries', () => {
    render(<DashboardScreen />, { wrapper: makeWrapper([], []) })
    expect(screen.getByText('Nenhum registro ainda')).toBeInTheDocument()
  })

  it('shows relative time when last feed entry exists', () => {
    render(<DashboardScreen />, { wrapper: makeWrapper([], [FEED_ENTRY]) })
    expect(screen.getByText('há 1h20')).toBeInTheDocument()
  })

  it('opens QuickRegisterSheet when Registrar button is clicked', () => {
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar mamada' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('calls setActiveTab with comunidade when Ver → is clicked', () => {
    const setActiveTab = vi.fn()
    useAppStore.setState({ setActiveTab } as any)
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: /ir para a comunidade/i }))
    expect(setActiveTab).toHaveBeenCalledWith('comunidade')
  })
})
