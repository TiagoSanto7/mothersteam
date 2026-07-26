import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { OrbeVisual } from './OrbeVisual'
import { useSaraTTS } from './hooks/useSaraTTS'

export type SaraResponseType = 'none' | 'options' | 'text'

export interface SaraOption<V = string> {
  label: string
  value: V
}

export interface SaraSaysProps<V = string> {
  message: string
  tts?: boolean
  responseType?: SaraResponseType
  options?: Array<SaraOption<V>>
  onRespond?: (value: V) => void
  onSpeechEnd?: () => void
  children?: React.ReactNode
}

export function SaraSays<V = string>({
  message,
  tts = false,
  responseType = 'none',
  options,
  onRespond,
  onSpeechEnd,
  children,
}: SaraSaysProps<V>) {
  const { state, amplitude, speak, stop } = useSaraTTS()
  const endedRef = useRef(false)

  useEffect(() => {
    if (!tts) return
    endedRef.current = false
    void speak(message)
    return () => {
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, tts])

  useEffect(() => {
    if (tts && state === 'done' && !endedRef.current) {
      endedRef.current = true
      onSpeechEnd?.()
    }
  }, [state, tts, onSpeechEnd])

  function handleOption(value: V) {
    stop()
    onRespond?.(value)
  }

  const orbState = tts && (state === 'playing' || state === 'loading') ? 'listening' : 'idle'

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-md mx-auto">
      <OrbeVisual amplitude={amplitude} state={orbState} size="md" />

      <motion.p
        key={message}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-[17px] leading-relaxed text-graphite text-center font-serif px-4"
      >
        {message}
      </motion.p>

      {responseType === 'options' && options && (
        <div className="w-full flex flex-col gap-2 px-4">
          <AnimatePresence>
            {options.map((opt, i) => (
              <motion.button
                key={String(opt.value)}
                type="button"
                onClick={() => handleOption(opt.value)}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 + i * 0.08 }}
                whileTap={{ scale: 0.97 }}
                className="w-full px-4 py-3 rounded-2xl bg-white border border-sara-linen text-left text-[15px] text-graphite shadow-sm active:bg-sara-cream"
              >
                {opt.label}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}

      {children}
    </div>
  )
}
