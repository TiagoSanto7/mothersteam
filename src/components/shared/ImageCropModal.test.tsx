import { describe, it, expect, vi, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImageCropModal } from './ImageCropModal'

const fakeUrl = 'blob:http://localhost/fake-image'

beforeAll(() => {
  // jsdom doesn't implement canvas.toBlob — stub it
  HTMLCanvasElement.prototype.toBlob = function (cb) {
    cb(new Blob(['test'], { type: 'image/jpeg' }))
  }
})

describe('ImageCropModal', () => {
  it('renders confirm and cancel buttons', () => {
    render(<ImageCropModal imageSrc={fakeUrl} onConfirm={vi.fn()} onCancel={vi.fn()} aspectRatio={1} />)
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
  })

  it('calls onCancel when cancel is clicked', () => {
    const onCancel = vi.fn()
    render(<ImageCropModal imageSrc={fakeUrl} onConfirm={vi.fn()} onCancel={onCancel} aspectRatio={1} />)
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onConfirm with a Blob when confirmed', async () => {
    const onConfirm = vi.fn()
    render(<ImageCropModal imageSrc={fakeUrl} onConfirm={onConfirm} onCancel={vi.fn()} aspectRatio={1} />)
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    await vi.waitFor(() => expect(onConfirm).toHaveBeenCalled(), { timeout: 500 })
  })
})
