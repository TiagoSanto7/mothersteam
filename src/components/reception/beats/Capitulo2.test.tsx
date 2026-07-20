import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Capitulo2 } from './Capitulo2'

describe('Capitulo2', () => {
  it('starts with mood question', () => {
    render(<Capitulo2 onComplete={() => {}} />)
    expect(screen.getByText(/como você tem se sentido/i)).toBeInTheDocument()
    expect(screen.getByText(/Confiante/i)).toBeInTheDocument()
  })

  it('advances to support question after mood selected', async () => {
    const user = userEvent.setup()
    render(<Capitulo2 onComplete={() => {}} />)
    await user.click(screen.getByText(/Cansada/i))
    expect(await screen.findByText(/frequência você consegue contar/i)).toBeInTheDocument()
    expect(screen.getByText(/Sempre tenho ajuda/i)).toBeInTheDocument()
  })

  it('calls onComplete with both answers after support selected', async () => {
    const onComplete = vi.fn()
    const user = userEvent.setup()
    render(<Capitulo2 onComplete={onComplete} />)
    await user.click(screen.getByText(/Ansiosa/i))
    await user.click(await screen.findByText(/Só em momentos específicos/i))
    expect(onComplete).toHaveBeenCalledWith({ mood: 'C', supportNetwork: 'B' })
  })
})
