import { Camera, Images } from 'lucide-react'

interface Props {
  onCamera: () => void
  onGallery: () => void
  onClose: () => void
}

export function ImageSourceSheet({ onCamera, onGallery, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Selecionar fonte de imagem"
        className="w-full max-w-sm bg-white rounded-t-3xl px-4 pt-4 pb-10 flex flex-col gap-2 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-2" />
        <button
          onClick={onCamera}
          className="flex items-center gap-3 w-full px-4 py-4 rounded-2xl hover:bg-mt-linen active:bg-mt-linen transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-mt-cream flex items-center justify-center flex-shrink-0">
            <Camera size={20} className="text-mt-rose" />
          </div>
          <div>
            <p className="text-sm font-semibold text-mt-charcoal">Tirar foto</p>
            <p className="text-xs text-mt-muted">Usar câmera agora</p>
          </div>
        </button>
        <button
          onClick={onGallery}
          className="flex items-center gap-3 w-full px-4 py-4 rounded-2xl hover:bg-mt-linen active:bg-mt-linen transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-full bg-mt-cream flex items-center justify-center flex-shrink-0">
            <Images size={20} className="text-mt-rose" />
          </div>
          <div>
            <p className="text-sm font-semibold text-mt-charcoal">Escolher da galeria</p>
            <p className="text-xs text-mt-muted">Selecionar foto existente</p>
          </div>
        </button>
      </div>
    </div>
  )
}
