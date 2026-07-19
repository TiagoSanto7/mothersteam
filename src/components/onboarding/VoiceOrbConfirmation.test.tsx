import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { VoiceOrbConfirmation } from './VoiceOrbConfirmation'
import type { VoiceCollectedProfile } from '../../hooks/useVoiceOrb'

const baseData: VoiceCollectedProfile = {
  motherName: 'Ana',
  primaryChild: { name: 'Beto', phase: 'postpartum', ageInDays: 60 },
  otherChildren: [{ name: 'Pedro', ageDescription: '3 anos' }],
}

describe('VoiceOrbConfirmation', () => {
  it('renders mother name', () => {
    render(<VoiceOrbConfirmation data={baseData} onConfirm={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByDisplayValue('Ana')).toBeTruthy()
  })

  it('renders baby name', () => {
    render(<VoiceOrbConfirmation data={baseData} onConfirm={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByDisplayValue('Beto')).toBeTruthy()
  })

  it('renders other children', () => {
    render(<VoiceOrbConfirmation data={baseData} onConfirm={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText(/Pedro/)).toBeTruthy()
    expect(screen.getByText(/3 anos/)).toBeTruthy()
  })

  it('calls onConfirm with updated name when edited', () => {
    const onConfirm = vi.fn()
    render(<VoiceOrbConfirmation data={baseData} onConfirm={onConfirm} onBack={vi.fn()} />)
    fireEvent.change(screen.getByDisplayValue('Ana'), { target: { value: 'Maria' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(onConfirm).toHaveBeenCalledWith(expect.objectContaining({ motherName: 'Maria' }))
  })

  it('calls onBack when back button clicked', () => {
    const onBack = vi.fn()
    render(<VoiceOrbConfirmation data={baseData} onConfirm={vi.fn()} onBack={onBack} />)
    fireEvent.click(screen.getByRole('button', { name: /voltar/i }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('removes other child when remove button clicked', () => {
    const onConfirm = vi.fn()
    render(<VoiceOrbConfirmation data={baseData} onConfirm={onConfirm} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /remover pedro/i }))
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ otherChildren: [] })
    )
  })
})
