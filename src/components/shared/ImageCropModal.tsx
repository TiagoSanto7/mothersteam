import { useRef, useState, useEffect, useCallback } from 'react'
import { Move } from 'lucide-react'

interface Props {
  imageSrc: string
  aspectRatio: number
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}

export function ImageCropModal({ imageSrc, aspectRatio, onConfirm, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const [scale, setScale] = useState(1)
  const [loaded, setLoaded] = useState(false)

  const PREVIEW = 280
  const cropW = PREVIEW
  const cropH = Math.round(PREVIEW / aspectRatio)

  useEffect(() => {
    const img = new Image()
    img.src = imageSrc
    img.onload = () => {
      imgRef.current = img
      setOffset({ x: 0, y: 0 })
      setLoaded(true)
    }
  }, [imageSrc])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, cropW, cropH)
    const sw = img.naturalWidth * scale
    const sh = img.naturalHeight * scale
    ctx.drawImage(img, offset.x, offset.y, sw, sh)
  }, [offset, scale, cropW, cropH])

  useEffect(() => { if (loaded) draw() }, [loaded, draw])

  function handlePointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy })
  }

  function handlePointerUp() { setDragging(false) }

  function handleConfirm() {
    const canvas = canvasRef.current
    if (!canvas) { onConfirm(new Blob()); return }
    canvas.toBlob((blob) => {
      onConfirm(blob ?? new Blob())
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center gap-6 p-6">
      <p className="text-white text-sm font-semibold">Arraste para reposicionar</p>

      <div
        className="relative overflow-hidden rounded-2xl border-2 border-sara-gold cursor-move"
        style={{ width: cropW, height: cropH }}
      >
        <canvas
          ref={canvasRef}
          width={cropW}
          height={cropH}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ display: 'block', touchAction: 'none' }}
        />
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <Move size={28} className="text-white/40" />
        </div>
      </div>

      <div className="flex items-center gap-3 w-full max-w-xs">
        <span className="text-white/60 text-xs">−</span>
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.01}
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          className="flex-1 accent-sara-gold"
        />
        <span className="text-white/60 text-xs">+</span>
      </div>

      <div className="flex gap-3 w-full max-w-xs">
        <button
          onClick={onCancel}
          aria-label="Cancelar"
          className="flex-1 py-3 rounded-2xl bg-white/20 text-white font-semibold text-sm"
        >
          Cancelar
        </button>
        <button
          onClick={handleConfirm}
          aria-label="Confirmar"
          className="flex-1 py-3 rounded-2xl bg-sara-gold text-white font-semibold text-sm"
        >
          Confirmar
        </button>
      </div>
    </div>
  )
}
