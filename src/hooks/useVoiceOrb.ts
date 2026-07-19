import { useState, useRef, useCallback } from 'react'
import { Conversation } from '@elevenlabs/client'

export type VoiceOrbState = 'idle' | 'connecting' | 'listening' | 'done' | 'error'

export interface VoiceCollectedProfile {
  motherName: string
  primaryChild: {
    name: string | null
    phase: 'pregnant' | 'postpartum'
    week?: number
    ageInDays?: number
  }
  otherChildren: Array<{ name: string; ageDescription: string }>
}

export interface UseVoiceOrbReturn {
  state: VoiceOrbState
  amplitude: number
  transcript: string
  collectedData: VoiceCollectedProfile | null
  error: string | null
  start: () => Promise<void>
  stop: () => void
}

export function useVoiceOrb(): UseVoiceOrbReturn {
  const [state, setState] = useState<VoiceOrbState>('idle')
  const [amplitude, setAmplitude] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [collectedData, setCollectedData] = useState<VoiceCollectedProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const conversationRef = useRef<{ endSession: () => Promise<void>; getOutputVolume: () => number } | null>(null)
  const rafRef = useRef<number>(0)

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    conversationRef.current?.endSession()
    conversationRef.current = null
    setState((s) => (s === 'done' ? 'done' : 'idle'))
    setAmplitude(0)
  }, [])

  const start = useCallback(async () => {
    cancelAnimationFrame(rafRef.current)
    conversationRef.current?.endSession()
    conversationRef.current = null
    setState('connecting')
    setError(null)
    setCollectedData(null)
    setTranscript('')

    try {
      const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string
      const conversation = await Conversation.startSession({
        agentId,
        onStatusChange: ({ status }: { status: string }) => {
          if (status === 'connected') setState((s) => (s === 'connecting' ? 'listening' : s))
          if (status === 'disconnected') setState((s) => (s === 'done' ? 'done' : 'idle'))
        },
        onError: (msg: string) => {
          setError(msg)
          setState('error')
        },
        onMessage: ({ message, source }: { message: string; source: string }) => {
          if (source === 'ai' || source === 'user') setTranscript(message)
        },
        clientTools: {
          confirmar_perfil: async (params: unknown) => {
            const data = params as VoiceCollectedProfile
            setCollectedData(data)
            setState('done')
            cancelAnimationFrame(rafRef.current)
            conversationRef.current?.endSession()
            return 'ok'
          },
        },
      })

      conversationRef.current = conversation
      setState('listening')

      let callDepth = 0
      const pollAmplitude = () => {
        callDepth++
        if (callDepth > 1) { callDepth--; return }
        if (conversationRef.current) {
          setAmplitude(conversation.getOutputVolume())
          rafRef.current = requestAnimationFrame(pollAmplitude)
        }
        callDepth--
      }
      rafRef.current = requestAnimationFrame(pollAmplitude)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro de conexão')
      setState('error')
    }
  }, [])

  return { state, amplitude, transcript, collectedData, error, start, stop }
}
