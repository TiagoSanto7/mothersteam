import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SaraAparece } from './SaraAparece'

describe('SaraAparece', () => {
  it('greets the mother by name', () => {
    render(<SaraAparece motherName="Ana" onContinue={() => {}} />)
    expect(screen.getByText(/Oi, Ana/i)).toBeInTheDocument()
  })

  it('falls back to "mãe" when name is empty', () => {
    render(<SaraAparece motherName="" onContinue={() => {}} />)
    expect(screen.getByText(/Oi, mãe/i)).toBeInTheDocument()
  })

  it('calls onContinue when Vamos lá clicked', async () => {
    const onContinue = vi.fn()
    const user = userEvent.setup()
    render(<SaraAparece motherName="Ana" onContinue={onContinue} />)
    await user.click(screen.getByRole('button', { name: /vamos lá/i }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })
})
