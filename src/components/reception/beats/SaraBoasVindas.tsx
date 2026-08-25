import { useEffect, useRef, useState, type FormEvent } from 'react'
import { OrbeVisual } from '../OrbeVisual'
import { ProgressBar } from '../ProgressBar'
import { useSaraNarration, WELCOME_CONFIG } from '../hooks/useSaraNarration'

interface Props {
  motherName: string
  onComplete: () => void
}

export function SaraBoasVindas({ motherName: _motherName, onComplete }: Props) {
  const {
    state,
    amplitude,
    collectedFatos,
    startConversation,
    sendTextResponse,
    stop,
  } = useSaraNarration()

  const [textInput, setTextInput] = useState('')
  const completedRef = useRef(false)

  useEffect(() => {
    void startConversation(WELCOME_CONFIG)
    return () => {
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (collectedFatos && !completedRef.current) {
      completedRef.current = true
      onComplete()
    }
  }, [collectedFatos, onComplete])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = textInput.trim()
    if (!trimmed) return
    sendTextResponse(trimmed)
    setTextInput('')
  }

  return (
    <div className="min-h-screen flex flex-col bg-mt-cream">
      <div className="px-6 pt-8">
        <ProgressBar percent={80} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
        <OrbeVisual amplitude={amplitude} state={state} size="md" />

        {state === 'connecting' && (
          <p className="text-[13px] text-mt-muted">Conectando…</p>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-[13px] text-mt-rose-dark text-center max-w-xs">
              Não foi possível conectar. Verifique as permissões de microfone e tente novamente.
            </p>
            <button
              type="button"
              onClick={() => void startConversation(WELCOME_CONFIG)}
              className="px-4 py-2 rounded-2xl bg-mt-rose text-white text-xs font-semibold"
            >
              Tentar de novo
            </button>
            <button
              type="button"
              onClick={() => { stop(); onComplete() }}
              className="px-4 py-2 rounded-2xl border border-mt-linen text-mt-muted text-xs"
            >
              Pular
            </button>
          </div>
        )}
      </div>

      <div className="px-6 pb-10 flex flex-col gap-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="ou digite pra Sara…"
            aria-label="Digite sua resposta"
            className="flex-1 px-4 py-3 rounded-2xl bg-white border border-mt-linen text-sm text-mt-charcoal placeholder:text-mt-muted focus:outline-none focus:border-mt-rose"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || (state !== 'listening' && state !== 'error')}
            aria-label="Enviar"
            className="px-4 py-3 rounded-2xl bg-mt-rose text-white text-sm font-semibold disabled:opacity-40"
          >
            →
          </button>
        </form>
      </div>
    </div>
  )
}
