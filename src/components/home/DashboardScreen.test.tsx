// src/components/home/DashboardScreen.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DashboardScreen, formatPhase, relativeTimeFeed } from './DashboardScreen'
import { useAppStore } from '../../store/useAppStore'
import type { ApiRoutineEntry, ApiBabyEntry } from '../../lib/types'
import type { PregnancyPhase } from '../../types'
import { todayISO, shiftISODate } from '../../lib/dateUtils'

const { mockApiFetch } = vi.hoisted(() => ({ mockApiFetch: vi.fn() }))
vi.mock('../../lib/api', () => ({ apiFetch: mockApiFetch, ApiError: class extends Error {} }))

const ROUTINE_ENTRY: ApiRoutineEntry = {
  id: '1', title: 'Pediatra', time: '23:59', date: todayISO(),
  category: 'appointment', done: false, userId: 'u1', createdAt: new Date().toISOString(),
}

/**
 * Builds the UTC instant for a wall-clock time on the local day `iso`.
 * Never hardcodes an offset: the device's own timezone decides, which is the
 * whole point — the same entry has a different UTC date in Cuiabá (-04) and
 * São Paulo (-03), and the app must be right in both.
 */
function localTimeToUTC(iso: string, hour: number, minute = 0): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, hour, minute).toISOString()
}

const FEED_ENTRY: ApiBabyEntry = {
  id: '1', time: '10:00', type: 'feed', detail: 'Esquerdo',
  userId: 'u1',
  createdAt: localTimeToUTC(todayISO(), 10),
}

function makeWrapper(
  routineItems: ApiRoutineEntry[] = [],
  babyEntries: ApiBabyEntry[] = [],
) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const today = todayISO()
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    qc.setQueryData(['routine', today], routineItems)
    qc.setQueryData(['baby'], babyEntries)
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  }
}

const originalSetActiveTab = useAppStore.getState().setActiveTab

beforeEach(() => {
  useAppStore.setState({
    isLoggedIn: true,
    motherName: 'Ana',
    phase: { stage: 'postpartum', ageInDays: 132 } as PregnancyPhase,
    lastFeedSide: 'left',
    setActiveTab: originalSetActiveTab,
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

  it('shows Sara card', () => {
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    expect(screen.getByText(/Sara diz/i)).toBeInTheDocument()
  })

  it('opens QuickRegisterSheet (via store) when Registrar button is clicked', () => {
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar amamentação' }))
    // Sheet is now rendered globally by MobileShell; DashboardScreen just triggers the store slot.
    expect(useAppStore.getState().babySheetMode).toBe('amamentacao')
  })

})

describe('DashboardScreen — emotional header', () => {
  it('shows contextual phrase for pregnant phase', () => {
    useAppStore.setState({
      isLoggedIn: true,
      motherName: 'Ana',
      phase: { stage: 'pregnant', week: 32 },
    })
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    expect(screen.getByText(/Reta final chegando/i)).toBeTruthy()
  })

  it('shows contextual phrase for postpartum phase', () => {
    useAppStore.setState({
      isLoggedIn: true,
      motherName: 'Ana',
      phase: { stage: 'postpartum', ageInDays: 10 },
    })
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    expect(screen.getByText(/mesmo exausta/i)).toBeTruthy()
  })
})

describe('DashboardScreen — Sara hero CTA', () => {
  it('shows "Conversar com a Sara" button', () => {
    useAppStore.setState({ isLoggedIn: true, motherName: 'Ana', phase: { stage: 'pregnant', week: 28 } })
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    const saraButtons = screen.getAllByRole('button', { name: /conversar com a sara/i })
    expect(saraButtons.length).toBeGreaterThan(0)
  })

  it('"Conversar com a Sara" navigates to maeIA tab', () => {
    useAppStore.setState({ isLoggedIn: true, motherName: 'Ana', phase: { stage: 'pregnant', week: 28 }, activeTab: 'hoje' })
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    // Click the first button (the Sara card CTA, not the FAB)
    fireEvent.click(screen.getAllByRole('button', { name: /conversar com a sara/i })[0])
    expect(useAppStore.getState().activeTab).toBe('maeIA')
  })

  it('renders Sara FAB button', () => {
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    // There may be multiple "Conversar com a Sara" elements (the card link + the FAB)
    // Use getAllByRole to check at least one FAB exists
    const saraButtons = screen.getAllByRole('button', { name: /conversar com a sara/i })
    expect(saraButtons.length).toBeGreaterThan(0)
  })

  it('Sara FAB navigates to maeIA tab without opening a local overlay', () => {
    useAppStore.setState({ activeTab: 'hoje' })
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    // Click the last button matching (the FAB, not the card link)
    const saraButtons = screen.getAllByRole('button', { name: /conversar com a sara/i })
    fireEvent.click(saraButtons[saraButtons.length - 1])
    expect(useAppStore.getState().activeTab).toBe('maeIA')
    expect(screen.queryByRole('button', { name: /^Voltar$/ })).not.toBeInTheDocument()
  })
})

describe('DashboardScreen — bloco Hoje', () => {
  it('renders "Hoje" section heading', () => {
    useAppStore.setState({ isLoggedIn: true, motherName: 'Ana', phase: { stage: 'pregnant', week: 28 } })
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    expect(screen.getByText('Hoje')).toBeTruthy()
  })

  it('shows "Dia livre hoje" when no routine items and no feed', () => {
    useAppStore.setState({ isLoggedIn: true, motherName: 'Ana', phase: { stage: 'pregnant', week: 28 } })
    render(<DashboardScreen />, { wrapper: makeWrapper([], []) })
    expect(screen.getByText(/dia livre hoje/i)).toBeTruthy()
  })

  it('shows routine item in timeline', () => {
    useAppStore.setState({ isLoggedIn: true, motherName: 'Ana', phase: { stage: 'pregnant', week: 28 } })
    render(<DashboardScreen />, { wrapper: makeWrapper([ROUTINE_ENTRY], []) })
    expect(screen.getByText('Pediatra')).toBeTruthy()
    expect(screen.getByText('23:59')).toBeTruthy()
  })

  it('shows amamentação in timeline from today feed entry', () => {
    useAppStore.setState({
      isLoggedIn: true,
      motherName: 'Ana',
      phase: { stage: 'postpartum', ageInDays: 60 },
      selectedDate: todayISO(),
    })
    render(<DashboardScreen />, { wrapper: makeWrapper([], [FEED_ENTRY]) })
    expect(screen.getByText('Amamentação')).toBeTruthy()
  })

  it('shows "Registrar amamentação" button', () => {
    useAppStore.setState({ isLoggedIn: true, motherName: 'Ana', phase: { stage: 'postpartum', ageInDays: 60 } })
    render(<DashboardScreen />, { wrapper: makeWrapper() })
    const buttons = screen.getAllByRole('button', { name: /registrar amamentação/i })
    expect(buttons.length).toBeGreaterThan(0)
  })

  // O dia da mãe é o dia do relógio dela, não o de Greenwich. Uma mamada às 23h
  // cai no dia UTC seguinte em qualquer fuso negativo (Brasil inteiro); uma às
  // 00h30 cai no dia UTC anterior em qualquer fuso positivo. Os dois casos têm
  // de aparecer como "hoje" — é o que quebrava quando a filtragem comparava a
  // data local com o texto de um timestamp UTC.
  it('mostra amamentação registrada no fim da noite (dia UTC seguinte em fusos negativos)', () => {
    useAppStore.setState({
      isLoggedIn: true,
      motherName: 'Ana',
      phase: { stage: 'postpartum', ageInDays: 60 },
      selectedDate: todayISO(),
    })
    const lateNightFeed: ApiBabyEntry = {
      id: '3', time: '23:00', type: 'feed', detail: 'Esquerdo',
      userId: 'u1', createdAt: localTimeToUTC(todayISO(), 23),
    }
    render(<DashboardScreen />, { wrapper: makeWrapper([], [lateNightFeed]) })
    expect(screen.getByText('Amamentação')).toBeTruthy()
  })

  it('mostra amamentação registrada de madrugada (dia UTC anterior em fusos positivos)', () => {
    useAppStore.setState({
      isLoggedIn: true,
      motherName: 'Ana',
      phase: { stage: 'postpartum', ageInDays: 60 },
      selectedDate: todayISO(),
    })
    const earlyMorningFeed: ApiBabyEntry = {
      id: '4', time: '00:30', type: 'feed', detail: 'Esquerdo',
      userId: 'u1', createdAt: localTimeToUTC(todayISO(), 0, 30),
    }
    render(<DashboardScreen />, { wrapper: makeWrapper([], [earlyMorningFeed]) })
    expect(screen.getByText('Amamentação')).toBeTruthy()
  })

  it('does not show amamentação from yesterday feed entry', () => {
    const yesterday = shiftISODate(todayISO(), -1)
    useAppStore.setState({
      isLoggedIn: true,
      motherName: 'Ana',
      phase: { stage: 'postpartum', ageInDays: 60 },
      selectedDate: todayISO(),
    })
    const yesterdayFeed: ApiBabyEntry = {
      id: '2', time: '10:00', type: 'feed', detail: 'Esquerdo',
      userId: 'u1', createdAt: localTimeToUTC(yesterday, 10),
    }
    render(<DashboardScreen />, { wrapper: makeWrapper([], [yesterdayFeed]) })
    expect(screen.queryByText('Amamentação')).toBeNull()
  })
})
