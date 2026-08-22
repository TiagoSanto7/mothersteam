import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MtBottomNav } from './MtBottomNav'

describe('MtBottomNav', () => {
  const baseProps = {
    activeTab: 'hoje' as const,
    onTabChange: vi.fn(),
    onCtaClick: vi.fn(),
  }

  beforeEach(() => vi.clearAllMocks())

  it('renders 4 tabs and 1 CTA', () => {
    render(<MtBottomNav {...baseProps} />)
    expect(screen.getByRole('tab', { name: /hoje/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /jornada/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /comunidade/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /perfil/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ações rápidas/i })).toBeInTheDocument()
  })

  it('active tab has text-mt-rose class', () => {
    render(<MtBottomNav {...baseProps} activeTab="comunidade" />)
    const tab = screen.getByRole('tab', { name: /comunidade/i })
    expect(tab.className).toMatch(/text-mt-rose/)
  })

  it('inactive tab has text-mt-muted', () => {
    render(<MtBottomNav {...baseProps} activeTab="hoje" />)
    const tab = screen.getByRole('tab', { name: /jornada/i })
    expect(tab.className).toMatch(/text-mt-muted/)
  })

  it('tap on tab fires onTabChange with tab id', () => {
    render(<MtBottomNav {...baseProps} />)
    fireEvent.click(screen.getByRole('tab', { name: /jornada/i }))
    expect(baseProps.onTabChange).toHaveBeenCalledWith('jornada')
  })

  it('tap on CTA fires onCtaClick', () => {
    render(<MtBottomNav {...baseProps} />)
    fireEvent.click(screen.getByRole('button', { name: /ações rápidas/i }))
    expect(baseProps.onCtaClick).toHaveBeenCalled()
  })
})
