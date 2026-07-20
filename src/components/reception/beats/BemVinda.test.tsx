import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BemVinda } from './BemVinda'

describe('BemVinda', () => {
  it('renders welcome copy', () => {
    render(<BemVinda onContinue={() => {}} />)
    expect(screen.getByText(/companhia para cada fase/i)).toBeInTheDocument()
  })

  it('calls onContinue when Começar is clicked', async () => {
    const onContinue = vi.fn()
    const user = userEvent.setup()
    render(<BemVinda onContinue={onContinue} />)
    await user.click(screen.getByRole('button', { name: /começar/i }))
    expect(onContinue).toHaveBeenCalledTimes(1)
  })
})
