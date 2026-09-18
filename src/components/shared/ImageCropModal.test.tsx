import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ImageCropModal } from './ImageCropModal'

const fakeUrl = 'blob:http://localhost/fake-image'

// jsdom doesn't actually decode images, so `new Image()` never fires load/error
// on its own — stub it with a controllable fake so tests can drive both paths.
class FakeImage {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  naturalWidth = 800
  naturalHeight = 600
  src = ''
}
let lastImage: FakeImage | null = null

beforeAll(() => {
  // jsdom doesn't implement canvas.toBlob — stub it
  HTMLCanvasElement.prototype.toBlob = function (cb) {
    cb(new Blob(['test'], { type: 'image/jpeg' }))
  }
})

beforeEach(() => {
  lastImage = null
  vi.stubGlobal('Image', class extends FakeImage {
    constructor() {
      super()
      lastImage = this
    }
  })
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

  it('disables Confirmar until the image finishes decoding, and ignores clicks meanwhile (TIA-56)', () => {
    const onConfirm = vi.fn()
    render(<ImageCropModal imageSrc={fakeUrl} onConfirm={onConfirm} onCancel={vi.fn()} aspectRatio={1} />)
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('calls onConfirm with a Blob once the image loads', async () => {
    const onConfirm = vi.fn()
    render(<ImageCropModal imageSrc={fakeUrl} onConfirm={onConfirm} onCancel={vi.fn()} aspectRatio={1} />)
    lastImage!.onload?.()
    await waitFor(() => expect(screen.getByRole('button', { name: /confirmar/i })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(expect.any(Blob)))
  })

  it('calls onError and never onConfirm when the image fails to decode (TIA-56)', async () => {
    const onConfirm = vi.fn()
    const onError = vi.fn()
    render(<ImageCropModal imageSrc={fakeUrl} onConfirm={onConfirm} onCancel={vi.fn()} onError={onError} aspectRatio={1} />)
    lastImage!.onerror?.()
    await waitFor(() => expect(onError).toHaveBeenCalledOnce())
    expect(screen.getByRole('button', { name: /confirmar/i })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('shows a loading message before the image decodes, then the drag hint', async () => {
    render(<ImageCropModal imageSrc={fakeUrl} onConfirm={vi.fn()} onCancel={vi.fn()} aspectRatio={1} />)
    expect(screen.getByText(/carregando imagem/i)).toBeInTheDocument()
    lastImage!.onload?.()
    await waitFor(() => expect(screen.getByText(/arraste para reposicionar/i)).toBeInTheDocument())
  })
})
