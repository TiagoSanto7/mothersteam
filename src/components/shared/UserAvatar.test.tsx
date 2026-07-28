import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UserAvatar } from './UserAvatar'

vi.mock('../../lib/api', () => ({
  resolveMediaUrl: (u: string) => u,
}))

describe('UserAvatar', () => {
  it('renders initial letter when no avatarUrl', () => {
    render(<UserAvatar name="Ana" archetypeKey={null} avatarUrl={null} size={40} />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('renders img when avatarUrl is provided', () => {
    render(<UserAvatar name="Ana" archetypeKey={null} avatarUrl="https://cdn.test/ana.jpg" size={40} />)
    const img = screen.getByRole('img', { name: 'Foto de Ana' })
    expect(img).toHaveAttribute('src', 'https://cdn.test/ana.jpg')
  })

  it('falls back to initial if img fails to load', async () => {
    render(<UserAvatar name="Ana" archetypeKey={null} avatarUrl="https://cdn.test/broken.jpg" size={40} />)
    const img = screen.getByRole('img')
    img.dispatchEvent(new Event('error'))
    expect(await screen.findByText('A')).toBeInTheDocument()
  })
})
