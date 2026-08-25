import { useState, useCallback } from 'react'
import type { ReceptionBeat } from '../../../types/reception'

const ORDER: ReceptionBeat[] = [
  'bem-vinda',
  'sara-aparece',
  'sara-boas-vindas',
  'preparando-tudo',
  'presente',
  'done',
]

export function useReceptionState() {
  const [beat, setBeat] = useState<ReceptionBeat>('bem-vinda')

  const advance = useCallback(() => {
    setBeat((current) => {
      const i = ORDER.indexOf(current)
      return ORDER[Math.min(i + 1, ORDER.length - 1)]
    })
  }, [])

  return { beat, advance }
}
