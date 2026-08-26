import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ReceptionFlow } from './ReceptionFlow'
import { useAppStore } from '../../store/useAppStore'

vi.mock('./beats/SaraBoasVindas', () => ({
  SaraBoasVindas: ({ onComplete }: { onComplete: () => void }) => (
    <button type="button" onClick={() => onComplete()}>
      done-boas-vindas
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

  it('advances from SaraAparece to SaraBoasVindas', async () => {
    useAppStore.setState({ motherName: 'Ana' })
    const user = userEvent.setup()
    render(<ReceptionFlow />)
    await user.click(screen.getByRole('button', { name: /começar/i }))
    await user.click(screen.getByRole('button', { name: /vamos lá/i }))
    expect(screen.getByText('done-boas-vindas')).toBeInTheDocument()
  })
})
