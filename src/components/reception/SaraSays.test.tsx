import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SaraSays } from './SaraSays'

const speakMock = vi.fn(() => Promise.resolve())
const stopMock = vi.fn()

vi.mock('./hooks/useSaraTTS', () => ({
  useSaraTTS: () => ({
    state: 'idle',
    amplitude: 0,
    speak: speakMock,
    stop: stopMock,
  }),
}))

beforeEach(() => {
  speakMock.mockClear()
  stopMock.mockClear()
})

describe('SaraSays', () => {
  it('renders the message', () => {
    render(<SaraSays message="Oi, tudo bem?" />)
    expect(screen.getByText('Oi, tudo bem?')).toBeInTheDocument()
  })

  it('does not call speak when tts is false', () => {
    render(<SaraSays message="Oi" tts={false} />)
    expect(speakMock).not.toHaveBeenCalled()
  })

  it('calls speak with the message when tts is true', () => {
    render(<SaraSays message="Oi" tts />)
    expect(speakMock).toHaveBeenCalledWith('Oi')
  })

  it('renders options when responseType=options', () => {
    render(
      <SaraSays
        message="Como você está?"
        responseType="options"
        options={[
          { label: 'Bem', value: 'A' },
          { label: 'Cansada', value: 'B' },
        ]}
      />,
    )
    expect(screen.getByRole('button', { name: 'Bem' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cansada' })).toBeInTheDocument()
  })

  it('calls onRespond with the option value when clicked', () => {
    const onRespond = vi.fn()
    render(
      <SaraSays
        message="?"
        responseType="options"
        options={[
          { label: 'A', value: 'a-val' },
          { label: 'B', value: 'b-val' },
        ]}
        onRespond={onRespond}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'B' }))
    expect(onRespond).toHaveBeenCalledWith('b-val')
    expect(stopMock).toHaveBeenCalled()
  })

  it('renders children as attachments below options', () => {
    render(
      <SaraSays message="Oi">
        <div data-testid="attachment">verso</div>
      </SaraSays>,
    )
    expect(screen.getByTestId('attachment')).toBeInTheDocument()
  })
})
