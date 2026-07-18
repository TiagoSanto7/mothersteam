import { render, screen, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ShareMomentoSheet } from './ShareMomentoSheet'
import { useAppStore } from '../../store/useAppStore'

const mockNavigatorShare = vi.fn()
const mockClipboard = vi.fn()

beforeEach(() => {
  useAppStore.setState({ pendingShareContent: null })
  Object.defineProperty(navigator, 'share', { value: mockNavigatorShare, configurable: true })
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText: mockClipboard },
    configurable: true,
  })
  mockNavigatorShare.mockResolvedValue(undefined)
  mockClipboard.mockResolvedValue(undefined)
})

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  verso: 'Venham a mim, todos os que estão cansados.',
  referencia: 'Mateus 11:28',
  oracao: 'Senhor, eu chego até Ti com esse cansaço.',
  onShareToFeed: vi.fn(),
  onShareToCommunity: vi.fn(),
}

describe('ShareMomentoSheet', () => {
  it('does not render when open is false', () => {
    render(<ShareMomentoSheet {...defaultProps} open={false} />)
    expect(screen.queryByText(/compartilhar versículo/i)).toBeNull()
  })

  it('renders toggle and 3 action buttons when open', () => {
    render(<ShareMomentoSheet {...defaultProps} />)
    expect(screen.getByRole('button', { name: /com oração/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /compartilhar com amigos/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /publicar no feed/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /compartilhar em comunidade/i })).toBeTruthy()
  })

  it('"Compartilhar com amigos" calls navigator.share with verse + oração when toggle is on', async () => {
    render(<ShareMomentoSheet {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /compartilhar com amigos/i }))
    expect(mockNavigatorShare).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.stringContaining('Senhor, eu chego') })
    )
  })

  it('"Publicar no feed" calls onShareToFeed with the text content', () => {
    const onShareToFeed = vi.fn()
    render(<ShareMomentoSheet {...defaultProps} onShareToFeed={onShareToFeed} />)
    fireEvent.click(screen.getByRole('button', { name: /publicar no feed/i }))
    expect(onShareToFeed).toHaveBeenCalledWith(expect.stringContaining('Mateus 11:28'))
  })

  it('"Compartilhar em comunidade" calls onShareToCommunity', () => {
    const onShareToCommunity = vi.fn()
    render(<ShareMomentoSheet {...defaultProps} onShareToCommunity={onShareToCommunity} />)
    fireEvent.click(screen.getByRole('button', { name: /compartilhar em comunidade/i }))
    expect(onShareToCommunity).toHaveBeenCalled()
  })

  it('toggle switches between com/sem oração', () => {
    render(<ShareMomentoSheet {...defaultProps} />)
    const semOracao = screen.getByRole('button', { name: /só o versículo/i })
    fireEvent.click(semOracao)
    fireEvent.click(screen.getByRole('button', { name: /compartilhar com amigos/i }))
    expect(mockNavigatorShare).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.not.stringContaining('Senhor, eu chego') })
    )
  })
})
