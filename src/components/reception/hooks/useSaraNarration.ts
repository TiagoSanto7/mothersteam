import { useState, useRef, useCallback } from 'react'
import { Conversation } from '@elevenlabs/client'

export type NarrationState = 'idle' | 'connecting' | 'listening' | 'done' | 'error'

export interface CapituloConfig {
  systemPrompt: string
  firstMessage: string
  toolName: string
}

export interface UseSaraNarrationReturn {
  state: NarrationState
  amplitude: number
  collectedFatos: unknown
  error: string | null
  startConversation: (config: CapituloConfig) => Promise<void>
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
  const [collectedFatos, setCollectedFatos] = useState<unknown>(null)
  const [error, setError] = useState<string | null>(null)
  const convRef = useRef<ElevenLabsConversation | null>(null)
  const rafRef = useRef<number>(0)
  const pollingRef = useRef(false)
  const callIdRef = useRef<symbol | null>(null)

  const stop = useCallback(() => {
    callIdRef.current = null
    pollingRef.current = false
    cancelAnimationFrame(rafRef.current)
    convRef.current?.endSession()
    convRef.current = null
    setState((s) => (s === 'done' ? 'done' : 'idle'))
    setAmplitude(0)
  }, [])

  const startConversation = useCallback(async (config: CapituloConfig) => {
    cancelAnimationFrame(rafRef.current)
    convRef.current?.endSession()
    convRef.current = null
    setState('connecting')
    setError(null)
    setCollectedFatos(null)

    const callId = Symbol()
    callIdRef.current = callId

    try {
      const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID as string
      const conversation = (await Conversation.startSession({
        agentId,
        overrides: {
          agent: {
            prompt: { prompt: config.systemPrompt },
            firstMessage: config.firstMessage,
          },
        },
        onStatusChange: ({ status }: { status: string }) => {
          if (status === 'connected') setState((s) => (s === 'connecting' ? 'listening' : s))
          if (status === 'disconnected') setState((s) => (s === 'done' ? 'done' : 'idle'))
        },
        onError: (msg: string, _context?: unknown) => {
          setError(msg)
          setState('error')
        },
        clientTools: {
          [config.toolName]: async (params: unknown) => {
            setCollectedFatos(params)
            setState('done')
            cancelAnimationFrame(rafRef.current)
            convRef.current?.endSession()
            convRef.current = null
            return 'ok'
          },
        },
      })) as unknown as ElevenLabsConversation

      if (callIdRef.current !== callId) {
        void conversation.endSession()
        return
      }

      convRef.current = conversation
      setState((s) => (s === 'done' || s === 'error' ? s : 'listening'))

      pollingRef.current = true
      const poll = () => {
        if (!pollingRef.current || !convRef.current) return
        setAmplitude(convRef.current.getOutputVolume())
        rafRef.current = requestAnimationFrame(poll)
      }
      rafRef.current = requestAnimationFrame(poll)
    } catch (e) {
      if (callIdRef.current !== callId) return
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
    collectedFatos,
    error,
    startConversation,
    sendTextResponse,
    stop,
  }
}

export const WELCOME_CONFIG: CapituloConfig = {
  toolName: 'finalizar_boas_vindas',
  firstMessage: 'Oi. Prazer te conhecer. Como você está se sentindo hoje?',
  systemPrompt: [
    'Você é a Sara. Está falando com uma mãe que acabou de completar o cadastro no Mother\'s Team.',
    'Seu papel é único: recebê-la de forma calorosa, escutar como ela está se sentindo, reagir com empatia curta, e reforçar que você estará por perto.',
    '',
    'Regras absolutas:',
    '- NÃO pergunte dados cadastrais (fase, semana, bebê, filhos, humor por categoria, objetivos, preocupações). A mãe já preencheu tudo isso.',
    '- Máximo 3 turnos: (1) você já perguntou como ela está, (2) ela responde e você reage empaticamente, (3) você diz a fala de encerramento e chama finalizar_boas_vindas.',
    '- NUNCA ofereça conselhos, planos, ou soluções aqui. Só acolhimento.',
    '',
    'Como você fala:',
    '- Como uma amiga que ela acabou de conhecer. Frases curtas, tom acolhedor.',
    '- Português do Brasil, sempre com acentuação correta.',
    '- Use expressões como "que bom te conhecer", "conta pra mim", "a gente".',
    '',
    'Fluxo de fala (após ela responder):',
    '2. Reaja com 1-2 frases curtas que reconhecem o que ela sentiu (ex.: "Faz sentido, tem sido bastante coisa, né?"). Não julgue, não console demais.',
    '3. Fale a linha de fechamento EXATA: "Aqui no Mother\'s Team você sempre será bem-vinda. E se precisar de mim, eu sempre estarei por perto." Depois chame finalizar_boas_vindas.',
  ].join('\n'),
}
