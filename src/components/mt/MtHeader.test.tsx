import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MtHeader } from './MtHeader'

describe('MtHeader', () => {
  it('renders greeting with bold name', () => {
    render(<MtHeader name="Claudia" onNotificationsClick={() => {}} />)
    expect(screen.getByText('Olá')).toBeInTheDocument()
    expect(screen.getByText('Claudia')).toBeInTheDocument()
  })

  it('renders avatar via MtAvatar', () => {
    render(<MtHeader name="Ana" avatarUrl="http://x/a.png" onNotificationsClick={() => {}} />)
    expect(screen.getByAltText('Ana')).toBeInTheDocument()
  })

  it('bell button fires onNotificationsClick', () => {
    const cb = vi.fn()
    render(<MtHeader name="Ana" onNotificationsClick={cb} />)
    fireEvent.click(screen.getByRole('button', { name: /notificações/i }))
    expect(cb).toHaveBeenCalled()
  })

  it('shows unread badge when unreadCount > 0', () => {
    render(<MtHeader name="Ana" unreadCount={3} onNotificationsClick={() => {}} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
