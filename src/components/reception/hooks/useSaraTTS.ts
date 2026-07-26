import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../../store/useAppStore'
import { resolveApiUrl } from '../../../lib/api'

export type TTSState = 'idle' | 'loading' | 'playing' | 'done' | 'error'

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext
}

export interface UseSaraTTSReturn {
  state: TTSState
  amplitude: number
  speak: (text: string) => Promise<void>
  stop: () => void
}

export function useSaraTTS(): UseSaraTTSReturn {
  const [state, setState] = useState<TTSState>('idle')
  const [amplitude, setAmplitude] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number>(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    analyserRef.current?.disconnect()
    analyserRef.current = null
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
      audioRef.current = null
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    setAmplitude(0)
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    cleanup()
    setState((s) => (s === 'done' ? 'done' : 'idle'))
  }, [cleanup])

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return
      abortRef.current?.abort()
      cleanup()
      setState('loading')

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const token = useAppStore.getState().accessToken
        const res = await fetch(resolveApiUrl('/sara/tts'), {
          method: 'POST',
          signal: controller.signal,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ text }),
        })
        if (!res.ok) throw new Error(`TTS ${res.status}`)

        const blob = await res.blob()
        if (controller.signal.aborted) return

        const url = URL.createObjectURL(blob)
        objectUrlRef.current = url

        const audio = new Audio(url)
        audio.crossOrigin = 'anonymous'
        audioRef.current = audio

        try {
          const win = window as WindowWithWebkitAudio
          const AudioCtx = window.AudioContext ?? win.webkitAudioContext
          if (AudioCtx) {
            const ctx = audioCtxRef.current ?? new AudioCtx()
            audioCtxRef.current = ctx
            if (ctx.state === 'suspended') await ctx.resume()
            const source = ctx.createMediaElementSource(audio)
            const analyser = ctx.createAnalyser()
            analyser.fftSize = 256
            source.connect(analyser)
            analyser.connect(ctx.destination)
            analyserRef.current = analyser
            const data = new Uint8Array(analyser.frequencyBinCount)
            const poll = () => {
              if (!analyserRef.current) return
              analyserRef.current.getByteFrequencyData(data)
              let sum = 0
              for (let i = 0; i < data.length; i++) sum += data[i]
              setAmplitude(sum / data.length / 255)
              rafRef.current = requestAnimationFrame(poll)
            }
            rafRef.current = requestAnimationFrame(poll)
          }
        } catch {
          // Analyser é opcional (Safari pode negar autoplay antes do gesto)
        }

        audio.addEventListener('ended', () => {
          setState('done')
          cancelAnimationFrame(rafRef.current)
          setAmplitude(0)
        })
        audio.addEventListener('error', () => {
          setState('error')
        })

        setState('playing')
        await audio.play()
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        setState('error')
      }
    },
    [cleanup],
  )

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      cleanup()
      audioCtxRef.current?.close().catch(() => {})
      audioCtxRef.current = null
    }
  }, [cleanup])

  return { state, amplitude, speak, stop }
}
