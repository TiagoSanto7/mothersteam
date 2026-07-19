import { useEffect } from 'react'
import { useVoiceOrb } from '../../hooks/useVoiceOrb'
import { VoiceOrb } from './VoiceOrb'
import { VoiceOrbConfirmation } from './VoiceOrbConfirmation'
import type { VoiceCollectedProfile } from '../../hooks/useVoiceOrb'

interface Props {
  onComplete: (data: VoiceCollectedProfile) => void
  onBack: () => void
}

export function VoiceOrbOnboarding({ onComplete, onBack }: Props) {
  const { state, amplitude, transcript, collectedData, error, start, stop } = useVoiceOrb()

  useEffect(() => () => { stop() }, [stop])

  if (state === 'done' && collectedData) {
    return (
      <VoiceOrbConfirmation
        data={collectedData}
        onConfirm={onComplete}
        onBack={() => start()}
      />
    )
  }

  if (state === 'listening' || state === 'connecting') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-sara-cream gap-8 px-6">
        <VoiceOrb amplitude={amplitude} state={state === 'listening' ? 'listening' : 'connecting'} />
        {transcript ? (
          <p className="text-sm text-graphite text-center leading-relaxed max-w-xs">
            &ldquo;{transcript}&rdquo;
          </p>
        ) : (
          <p className="text-sm text-graphite-muted text-center">
            {state === 'connecting' ? 'Conectando com a Sara…' : 'Ouvindo…'}
          </p>
        )}
        <button
          onClick={stop}
          aria-label="Encerrar conversa"
          className="text-sm text-graphite-muted px-5 py-2 rounded-full border border-sara-linen"
        >
          Encerrar conversa
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-sara-cream gap-6 px-6">
      <div className="text-center">
        <p className="text-[20px] font-semibold font-serif text-graphite mb-2">
          Olá! Sou a Sara 🌷
        </p>
        <p className="text-[14px] text-graphite-muted leading-relaxed max-w-xs">
          Vou te fazer algumas perguntas para personalizar sua experiência.
          Pode falar normalmente — estou aqui para te ouvir.
        </p>
      </div>
      {error && (
        <p className="text-sara-terracotta text-sm text-center">{error}</p>
      )}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={start}
          aria-label="Começar conversa"
          className="w-full py-4 rounded-2xl bg-sara-gold text-white text-sm font-semibold"
        >
          Começar conversa 🎙️
        </button>
        <button
          onClick={onBack}
          aria-label="Voltar"
          className="text-sm text-graphite-muted text-center py-2"
        >
          Voltar
        </button>
      </div>
    </div>
  )
}
