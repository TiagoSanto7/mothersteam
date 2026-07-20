import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { OrbeVisual } from './OrbeVisual'

describe('OrbeVisual', () => {
  it('renders in idle state', () => {
    const { getByLabelText } = render(<OrbeVisual amplitude={0} state="idle" />)
    expect(getByLabelText('Sara')).toBeInTheDocument()
  })

  it('renders in listening state without crashing', () => {
    const { getByLabelText } = render(<OrbeVisual amplitude={0.5} state="listening" />)
    expect(getByLabelText('Sara')).toBeInTheDocument()
  })

  it('handles NaN amplitude without crash', () => {
    const { getByLabelText } = render(<OrbeVisual amplitude={NaN} state="listening" />)
    expect(getByLabelText('Sara')).toBeInTheDocument()
  })

  it('handles Infinity amplitude without crash', () => {
    const { getByLabelText } = render(<OrbeVisual amplitude={Infinity} state="listening" />)
    expect(getByLabelText('Sara')).toBeInTheDocument()
  })

  it('renders with size sm', () => {
    const { getByLabelText } = render(<OrbeVisual amplitude={0} state="idle" size="sm" />)
    expect(getByLabelText('Sara').className).toContain('w-24')
  })
})
