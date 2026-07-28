import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImageSourceSheet } from './ImageSourceSheet'

describe('ImageSourceSheet', () => {
  it('renders two options: camera and gallery', () => {
    render(<ImageSourceSheet onCamera={vi.fn()} onGallery={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Tirar foto')).toBeInTheDocument()
    expect(screen.getByText('Escolher da galeria')).toBeInTheDocument()
  })

  it('calls onCamera when camera option is tapped', () => {
    const onCamera = vi.fn()
    render(<ImageSourceSheet onCamera={onCamera} onGallery={vi.fn()} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('Tirar foto'))
    expect(onCamera).toHaveBeenCalledOnce()
  })

  it('calls onGallery when gallery option is tapped', () => {
    const onGallery = vi.fn()
    render(<ImageSourceSheet onCamera={vi.fn()} onGallery={onGallery} onClose={vi.fn()} />)
    fireEvent.click(screen.getByText('Escolher da galeria'))
    expect(onGallery).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop is tapped', () => {
    const onClose = vi.fn()
    render(<ImageSourceSheet onCamera={vi.fn()} onGallery={vi.fn()} onClose={onClose} />)
    fireEvent.click(screen.getByRole('dialog').parentElement!)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
