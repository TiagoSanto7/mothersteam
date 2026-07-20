import { useState, useRef, useCallback } from 'react'
import { Conversation } from '@elevenlabs/client'
import type { ReceptionData } from '../../../types/reception'

export type NarrationState = 'idle' | 'connecting' | 'listening' | 'done' | 'error'

export interface Capitulo1Fatos {
  motherName: string
  phase: 'pregnant' | 'postpartum'
  week?: number
  ageInDays?: number
  babyName?: string | null
  otherChildren?: Array<{ name: string; ageDescription: string }>
}

export interface UseSaraNarrationReturn {
  state: NarrationState
  amplitude: number
  transcript: string
  collectedFatos: Capitulo1Fatos | null
  error: string | null
  startCapitulo1: () => Promise<void>
  sendTextResponse: (text: string) => void
  stop: () => void
}

interface ElevenLabsConversation {
  endSession: () => Promise<void>
  getOutputVolume: () => number
  sendUserMessage?: (text: string) => void
  sendContextualUpdate?: (text: string) => void
}

export function useSaraNarration(): UseSaraNarrationReturn {
  const [state, setState] = useState<NarrationState>('idle')
  const [amplitude, setAmplitude] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [collectedFatos, setCollectedFatos] = useState<Capitulo1Fatos | null>(null)
  const [error, setError] = useState<string | null>(null)
  const convRef = useRef<ElevenLabsConversation | null>(null)
  const rafRef = useRef<number>(0)
  const pollingRef = useRef(false)

  const stop = useCallback(() => {
    pollingRef.current = false
    cancelAnimationFrame(rafRef.current)
    convRef.current?.endSession()
    convRef.current = null
    setState((s) => (s === 'done' ? 'done' : 'idle'))
    setAmplitude(0)
  }, [])

  const startCapitulo1 = useCallback(async () => {
    cancelAnimationFrame(rafRef.current)
    convRef.current?.endSession()
    convRef.current = null
    setState('connecting')
    setError(null)
    setCollectedFatos(null)
    setTranscript('')

    try {
      const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string
      const conversation = (await Conversation.startSession({
        agentId,
        onStatusChange: ({ status }: { status: string }) => {
          if (status === 'connected') setState((s) => (s === 'connecting' ? 'listening' : s))
          if (status === 'disconnected') setState((s) => (s === 'done' ? 'done' : 'idle'))
        },
        onError: (msg: string, _context?: unknown) => {
          setError(msg)
          setState('error')
        },
        onMessage: ({ message, source }: { message: string; source: string }) => {
          if (source === 'ai' || source === 'user') setTranscript(message)
        },
        clientTools: {
          confirmar_capitulo_1_fatos: async (params: unknown) => {
            const data = params as Capitulo1Fatos
            setCollectedFatos(data)
            setState('done')
            cancelAnimationFrame(rafRef.current)
            convRef.current?.endSession()
            convRef.current = null
            return 'ok'
          },
        },
      })) as unknown as ElevenLabsConversation

      convRef.current = conversation
      setState((s) => (s === 'done' || s === 'error' ? s : 'listening'))

      pollingRef.current = true
      const poll = () => {
        if (!pollingRef.current || !convRef.current) return
        setAmplitude(convRef.current.getOutputVolume())
        pollingRef.current = false
        rafRef.current = requestAnimationFrame(poll)
        pollingRef.current = true
      }
      rafRef.current = requestAnimationFrame(poll)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro de conexão')
      setState('error')
    }
  }, [])

  const sendTextResponse = useCallback((text: string) => {
    const conv = convRef.current
    if (!conv) return
    if (typeof conv.sendUserMessage === 'function') {
      conv.sendUserMessage(text)
      return
    }
    if (typeof conv.sendContextualUpdate === 'function') {
      conv.sendContextualUpdate(text)
      return
    }
    console.warn('[useSaraNarration] SDK sem método pra injetar user text; instale versão mais recente do @elevenlabs/client.')
  }, [])

  return {
    state,
    amplitude,
    transcript,
    collectedFatos,
    error,
    startCapitulo1,
    sendTextResponse,
    stop,
  }
}

export function receptionDataFromCapitulo1(fatos: Capitulo1Fatos): Partial<ReceptionData> {
  return {
    motherName: fatos.motherName,
    phase: fatos.phase,
    week: fatos.week,
    ageInDays: fatos.ageInDays,
    babyName: fatos.babyName ?? null,
    otherChildren: fatos.otherChildren ?? [],
  }
}
