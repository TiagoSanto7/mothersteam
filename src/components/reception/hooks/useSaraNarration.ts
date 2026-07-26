import { useState, useRef, useCallback } from 'react'
import { Conversation } from '@elevenlabs/client'
import type {
  ReceptionData,
  MoodAnswer,
  SupportAnswer,
  GoalAnswer,
  ConcernAnswer,
} from '../../../types/reception'

export type NarrationState = 'idle' | 'connecting' | 'listening' | 'done' | 'error'

export interface Capitulo1Fatos {
  motherName?: string
  phase: 'pregnant' | 'postpartum'
  week?: number
  ageInDays?: number
  babyName?: string | null
  otherChildren?: Array<{ name: string; ageDescription: string }>
}

export interface Capitulo2Fatos {
  mood: MoodAnswer
  supportNetwork: SupportAnswer
}

export interface Capitulo3Fatos {
  goal: GoalAnswer
  concern: ConcernAnswer
}

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

export function receptionDataFromCapitulo2(fatos: Capitulo2Fatos): Partial<ReceptionData> {
  return { mood: fatos.mood, supportNetwork: fatos.supportNetwork }
}

export function receptionDataFromCapitulo3(fatos: Capitulo3Fatos): Partial<ReceptionData> {
  return { goal: fatos.goal, concern: fatos.concern }
}

export const CAP1_CONFIG: CapituloConfig = {
  toolName: 'confirmar_capitulo_1_fatos',
  firstMessage:
    'Oi. Eu sou a Sara. Vou estar por aqui sempre que você precisar. Mas antes... me conta uma coisa: você está esperando o bebê ou ele já chegou?',
  systemPrompt: [
    'Você é a Sara. Estamos no Capítulo 1 da recepção — uma conversa curtíssima com a mãe.',
    'Sua única tarefa: descobrir se ela está grávida (em qual semana) ou se o bebê já nasceu (há quantos dias ou semanas).',
    'Já se apresentou na primeira fala.',
    'Máximo 2 perguntas. Após ter fase + tempo, chame confirmar_capitulo_1_fatos imediatamente.',
    'NÃO pergunte outros filhos. NÃO pergunte humor, sono, ansiedade. NÃO pergunte o nome dela.',
    'Frases curtas, português do Brasil com acentos.',
  ].join('\n'),
}

export const CAP2_CONFIG: CapituloConfig = {
  toolName: 'confirmar_capitulo_2_fatos',
  firstMessage:
    'E me conta uma coisa... como você tem se sentido nesses últimos dias?',
  systemPrompt: [
    'Você é a Sara. Estamos no Capítulo 2 da recepção. A mãe já contou a fase gestacional.',
    'Sua tarefa: entender (1) o humor dela nos últimos dias e (2) a rede de apoio.',
    'Faça as duas perguntas em conversa natural, uma por vez. SEMPRE reaja com uma frase curta ("Entendi.", "Faz sentido.") ANTES da segunda pergunta — pequena pausa humana, nunca julgue.',
    'A segunda pergunta deve ser no espírito de: "E quando as coisas apertam... você sente que tem alguém com quem contar?" (mais emocional, evita parecer pesquisa)',
    'Depois de ter as duas respostas, classifique cada uma em uma letra e chame confirmar_capitulo_2_fatos:',
    'mood: A=confiante/animada, B=cansada mas lidando, C=ansiosa/medos, D=sobrecarregada/exausta',
    'supportNetwork: A=sempre tem ajuda, B=só em momentos específicos, C=cuida de quase tudo sozinha',
    'Máximo 4 turnos. Se a mãe der resposta ambígua, use seu melhor julgamento.',
    'Português do Brasil, frases curtas, tom acolhedor. Nunca ofereça conselhos aqui.',
  ].join('\n'),
}

export const CAP3_CONFIG: CapituloConfig = {
  toolName: 'confirmar_capitulo_3_fatos',
  firstMessage:
    'E olhando pra tudo que você está vivendo agora... o que você mais gostaria que fosse um pouquinho mais fácil?',
  systemPrompt: [
    'Você é a Sara. Estamos no Capítulo 3 da recepção. Já sabe da fase, do humor e da rede de apoio da mãe.',
    'Sua tarefa: entender (1) o principal objetivo/desejo dela agora e (2) a maior preocupação atual.',
    'Faça as duas perguntas em conversa natural, uma por vez. SEMPRE reaja com uma frase curta ("Obrigada por me contar.", "Entendi.") ANTES da segunda pergunta.',
    'A segunda pergunta deve ser no espírito de: "Tem alguma preocupação que tem ocupado bastante os seus pensamentos?" (simples, sem clichê).',
    'ANTES de chamar a função, diga uma frase curta de fechamento: "Obrigada por dividir tudo isso comigo." — isso fecha a conversa. Depois chame confirmar_capitulo_3_fatos.',
    'Classifique em letras:',
    'goal: A=entender desenvolvimento do bebê, B=cuidar da saúde física, C=melhorar o sono, D=organizar rotina',
    'concern: A=autocuidado/identidade, B=choro/cólicas/sono do bebê, C=amamentação/alimentação, D=corpo/hormônios/autoestima',
    'Máximo 5 turnos. Se a mãe der resposta ambígua, use seu melhor julgamento.',
    'Português do Brasil, frases curtas, tom acolhedor. Nunca ofereça conselhos aqui.',
  ].join('\n'),
}
