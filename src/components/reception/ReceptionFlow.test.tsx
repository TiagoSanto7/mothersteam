import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ReceptionFlow } from './ReceptionFlow'
import { useAppStore } from '../../store/useAppStore'

vi.mock('./beats/Capitulo1', () => ({
  Capitulo1: ({ onComplete }: { onComplete: (d: unknown) => void }) => (
    <button type="button" onClick={() => onComplete({ motherName: 'Ana', phase: 'pregnant', week: 28, otherChildren: [] })}>
      done-cap1
    </button>
  ),
}))

describe('ReceptionFlow', () => {
  it('starts on BemVinda beat', () => {
    useAppStore.setState({ motherName: 'Ana' })
    render(<ReceptionFlow />)
    expect(screen.getByText(/companhia para cada fase/i)).toBeInTheDocument()
  })

  it('advances from BemVinda to SaraAparece', async () => {
    useAppStore.setState({ motherName: 'Ana' })
    const user = userEvent.setup()
    render(<ReceptionFlow />)
    await user.click(screen.getByRole('button', { name: /começar/i }))
    expect(screen.getByText(/Oi, Ana/i)).toBeInTheDocument()
  })

  it('advances from SaraAparece to Capitulo1', async () => {
    useAppStore.setState({ motherName: 'Ana' })
    const user = userEvent.setup()
    render(<ReceptionFlow />)
    await user.click(screen.getByRole('button', { name: /começar/i }))
    await user.click(screen.getByRole('button', { name: /vamos lá/i }))
    expect(screen.getByText('done-cap1')).toBeInTheDocument()
  })
})
