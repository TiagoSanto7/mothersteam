import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SavedVersesScreen, shareVerse } from './SavedVersesScreen'
import { useAppStore } from '../../store/useAppStore'

// ─── helpers ──────────────────────────────────────────────────────────────────

function resetStore() {
  useAppStore.setState({
    savedVerses: [],
    versesByUser: {},
    prayersByUser: {},
    currentUserId: null,
  })
}

// ─── Bug 1 — userId isolation ─────────────────────────────────────────────────

describe('Bug 1 — verses are isolated per userId', () => {
  beforeEach(resetStore)

  it('user A does not see verses saved by user B', () => {
    // User A saves a verse
    useAppStore.setState({ currentUserId: 'user-A' })
    useAppStore.getState().saveVerse('Mateus 11:28')

    // Switch to user B — should have empty list
    useAppStore.setState({ currentUserId: 'user-B' })
    const { unmount } = render(<SavedVersesScreen open onClose={vi.fn()} />)
    expect(screen.getByText(/ainda não salvou nenhum versículo/i)).toBeTruthy()
    unmount()
  })

  it('user A sees only their own saved verses', () => {
    useAppStore.setState({ currentUserId: 'user-A' })
    useAppStore.getState().saveVerse('Mateus 11:28')

    useAppStore.setState({ currentUserId: 'user-B' })
    useAppStore.getState().saveVerse('Salmos 46:1')

    // Switch back to user A
    useAppStore.setState({ currentUserId: 'user-A' })
    render(<SavedVersesScreen open onClose={vi.fn()} />)

    // Mateus 11:28 belongs to user A
    expect(screen.getByText(/cansados e sobrecarregados/i)).toBeTruthy()
    // Salmos 46:1 belongs to user B — must NOT appear
    expect(screen.queryByText(/refúgio e força/i)).toBeNull()
  })

  it('anonymous user (__anon__) has their own verse bucket', () => {
    useAppStore.setState({ currentUserId: null })
    useAppStore.getState().saveVerse('Mateus 11:28')

    // After logging in as user-C, should see empty
    useAppStore.setState({ currentUserId: 'user-C' })
    render(<SavedVersesScreen open onClose={vi.fn()} />)
    expect(screen.getByText(/ainda não salvou nenhum versículo/i)).toBeTruthy()
  })

  it('saveVerse and unsaveVerse are scoped to currentUserId', () => {
    useAppStore.setState({ currentUserId: 'user-A' })
    useAppStore.getState().saveVerse('Mateus 11:28')
    useAppStore.getState().saveVerse('Salmos 46:1')
    useAppStore.getState().unsaveVerse('Mateus 11:28')

    const state = useAppStore.getState()
    expect(state.versesByUser['user-A']).toEqual(['Salmos 46:1'])
  })
})

// ─── existing behaviour ───────────────────────────────────────────────────────

describe('SavedVersesScreen — existing behaviour', () => {
  beforeEach(resetStore)

  it('does not render when open is false', () => {
    useAppStore.setState({ currentUserId: 'user-A', versesByUser: { 'user-A': ['Mateus 11:28'] } })
    render(<SavedVersesScreen open={false} onClose={vi.fn()} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows empty state when no verses saved', () => {
    useAppStore.setState({ currentUserId: 'user-A' })
    render(<SavedVersesScreen open onClose={vi.fn()} />)
    expect(screen.getByText(/ainda não salvou nenhum versículo/i)).toBeTruthy()
  })

  it('shows verse text for a saved reference', () => {
    useAppStore.setState({ currentUserId: 'user-A', versesByUser: { 'user-A': ['Mateus 11:28'] } })
    render(<SavedVersesScreen open onClose={vi.fn()} />)
    expect(screen.getByText(/cansados e sobrecarregados/i)).toBeTruthy()
    expect(screen.getByText('Mateus 11:28')).toBeTruthy()
  })

  it('calls unsaveVerse when remove button is tapped', () => {
    useAppStore.setState({ currentUserId: 'user-A', versesByUser: { 'user-A': ['Mateus 11:28'] } })
    render(<SavedVersesScreen open onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /remover/i }))
    const state = useAppStore.getState()
    expect(state.versesByUser['user-A']).toEqual([])
  })

  it('calls onClose when × button is tapped', () => {
    const onClose = vi.fn()
    useAppStore.setState({ currentUserId: 'user-A' })
    render(<SavedVersesScreen open onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }))
    expect(onClose).toHaveBeenCalled()
  })
})

// ─── Melhoria 2 — prayer textarea ─────────────────────────────────────────────

describe('Melhoria 2 — prayer textarea', () => {
  beforeEach(resetStore)

  it('shows "Oração" button for each saved verse', () => {
    useAppStore.setState({ currentUserId: 'user-A', versesByUser: { 'user-A': ['Mateus 11:28'] } })
    render(<SavedVersesScreen open onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /escrever oração/i })).toBeTruthy()
  })

  it('opens textarea when "Oração" button is clicked', () => {
    useAppStore.setState({ currentUserId: 'user-A', versesByUser: { 'user-A': ['Mateus 11:28'] } })
    render(<SavedVersesScreen open onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /escrever oração/i }))
    expect(screen.getByRole('textbox', { name: /escreva sua oração/i })).toBeTruthy()
  })

  it('does not show the default verse oracao text — only user textarea', () => {
    useAppStore.setState({ currentUserId: 'user-A', versesByUser: { 'user-A': ['Mateus 11:28'] } })
    render(<SavedVersesScreen open onClose={vi.fn()} />)
    // The static prayer text from momentoDeus.ts must NOT appear directly in the card
    expect(screen.queryByText(/chego até Ti com esse cansaço real/i)).toBeNull()
  })

  it('saves prayer text to store when "Salvar oração" is clicked', () => {
    useAppStore.setState({ currentUserId: 'user-A', versesByUser: { 'user-A': ['Mateus 11:28'] } })
    render(<SavedVersesScreen open onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /escrever oração/i }))

    const textarea = screen.getByRole('textbox', { name: /escreva sua oração/i })
    fireEvent.change(textarea, { target: { value: 'Senhor, obrigada.' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar oração/i }))

    const state = useAppStore.getState()
    expect(state.prayersByUser['user-A']?.['Mateus 11:28']).toBe('Senhor, obrigada.')
  })

  it('closes textarea after saving', () => {
    useAppStore.setState({ currentUserId: 'user-A', versesByUser: { 'user-A': ['Mateus 11:28'] } })
    render(<SavedVersesScreen open onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /escrever oração/i }))
    fireEvent.click(screen.getByRole('button', { name: /salvar oração/i }))
    // After save, textarea should be gone
    expect(screen.queryByRole('textbox', { name: /escreva sua oração/i })).toBeNull()
  })

  it('closes textarea when "Cancelar" is clicked without saving', () => {
    useAppStore.setState({ currentUserId: 'user-A', versesByUser: { 'user-A': ['Mateus 11:28'] } })
    render(<SavedVersesScreen open onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /escrever oração/i }))

    const textarea = screen.getByRole('textbox', { name: /escreva sua oração/i })
    fireEvent.change(textarea, { target: { value: 'Texto que não deve salvar' } })
    fireEvent.click(screen.getByRole('button', { name: /cancelar oração/i }))

    const state = useAppStore.getState()
    expect(state.prayersByUser?.['user-A']?.['Mateus 11:28']).toBeUndefined()
    expect(screen.queryByRole('textbox', { name: /escreva sua oração/i })).toBeNull()
  })

  it('pre-fills textarea with previously saved prayer', () => {
    useAppStore.setState({
      currentUserId: 'user-A',
      versesByUser: { 'user-A': ['Mateus 11:28'] },
      prayersByUser: { 'user-A': { 'Mateus 11:28': 'Oração anterior.' } },
    })
    render(<SavedVersesScreen open onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /editar oração/i }))
    const textarea = screen.getByRole('textbox', { name: /escreva sua oração/i }) as HTMLTextAreaElement
    expect(textarea.value).toBe('Oração anterior.')
  })

  it('prayers are isolated per userId', () => {
    useAppStore.setState({
      currentUserId: 'user-A',
      versesByUser: { 'user-A': ['Mateus 11:28'], 'user-B': ['Mateus 11:28'] },
      prayersByUser: { 'user-B': { 'Mateus 11:28': 'Oração do usuário B.' } },
    })
    // User A saves their own prayer
    useAppStore.getState().savePrayer('Mateus 11:28', 'Oração do usuário A.')

    const state = useAppStore.getState()
    expect(state.prayersByUser['user-A']?.['Mateus 11:28']).toBe('Oração do usuário A.')
    expect(state.prayersByUser['user-B']?.['Mateus 11:28']).toBe('Oração do usuário B.')
  })
})

// ─── Melhoria 3 — share button ────────────────────────────────────────────────

describe('Melhoria 3 — share button', () => {
  beforeEach(resetStore)

  it('shows "Compartilhar" button for each saved verse', () => {
    useAppStore.setState({ currentUserId: 'user-A', versesByUser: { 'user-A': ['Mateus 11:28'] } })
    render(<SavedVersesScreen open onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /compartilhar versículo/i })).toBeTruthy()
  })

  it('shareVerse copies text to clipboard when navigator.share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    // Ensure navigator.share is NOT present
    const originalShare = (navigator as any).share
    delete (navigator as any).share

    const result = await shareVerse('Venham a mim...', 'Mateus 11:28')
    expect(result).toBe('copied')
    expect(writeText).toHaveBeenCalledWith('"Venham a mim..." — Mateus 11:28')

    if (originalShare) (navigator as any).share = originalShare
  })

  it('shareVerse uses navigator.share when available', async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', {
      value: shareMock,
      configurable: true,
    })

    const result = await shareVerse('Venham a mim...', 'Mateus 11:28')
    expect(result).toBe('shared')
    expect(shareMock).toHaveBeenCalledWith({ text: '"Venham a mim..." — Mateus 11:28' })

    delete (navigator as any).share
  })

  it('shareVerse falls back to clipboard when navigator.share rejects', async () => {
    const shareMock = vi.fn().mockRejectedValue(new Error('AbortError'))
    Object.defineProperty(navigator, 'share', {
      value: shareMock,
      configurable: true,
    })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })

    const result = await shareVerse('Venham a mim...', 'Mateus 11:28')
    expect(result).toBe('copied')
    expect(writeText).toHaveBeenCalled()

    delete (navigator as any).share
  })

  it('shows share button in readOnly mode', () => {
    render(
      <SavedVersesScreen
        open={true}
        onClose={vi.fn()}
        readOnlyVerses={['Mateus 11:28']}
        readOnlyUserName="Maria"
      />
    )
    expect(screen.getByLabelText('Compartilhar versículo')).toBeInTheDocument()
  })

  it('shows save button in readOnly mode', () => {
    render(
      <SavedVersesScreen
        open={true}
        onClose={vi.fn()}
        readOnlyVerses={['Mateus 11:28']}
        readOnlyUserName="Maria"
      />
    )
    expect(screen.getByLabelText('Salvar versículo')).toBeInTheDocument()
  })

  it('shareVerse returns "error" when both share and clipboard fail', async () => {
    delete (navigator as any).share
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    })

    const result = await shareVerse('Venham a mim...', 'Mateus 11:28')
    expect(result).toBe('error')
  })

  it('clicking share button calls shareVerse with correct verse and ref', async () => {
    useAppStore.setState({ currentUserId: 'user-A', versesByUser: { 'user-A': ['Mateus 11:28'] } })
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    delete (navigator as any).share

    render(<SavedVersesScreen open onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /compartilhar versículo/i }))

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        expect.stringContaining('Mateus 11:28'),
      )
    })
  })
})
