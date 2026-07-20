import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Capitulo3 } from './Capitulo3'

describe('Capitulo3', () => {
  it('starts with goal question', () => {
    render(<Capitulo3 onComplete={() => {}} />)
    expect(screen.getByText(/o que você mais gostaria/i)).toBeInTheDocument()
    expect(screen.getByText(/desenvolvimento do bebê/i)).toBeInTheDocument()
  })

  it('advances to concern question after goal selected', async () => {
    const user = userEvent.setup()
    render(<Capitulo3 onComplete={() => {}} />)
    await user.click(screen.getByText(/desenvolvimento do bebê/i))
    expect(await screen.findByText(/tirando um pouquinho do seu sono/i)).toBeInTheDocument()
    expect(screen.getByText(/Autocuidado/i)).toBeInTheDocument()
  })

  it('calls onComplete with both answers after concern selected', async () => {
    const onComplete = vi.fn()
    const user = userEvent.setup()
    render(<Capitulo3 onComplete={onComplete} />)
    await user.click(screen.getByText(/Melhorar o sono/i))
    await user.click(await screen.findByText(/Choro, cólicas/i))
    expect(onComplete).toHaveBeenCalledWith({ goal: 'C', concern: 'B' })
  })
})
