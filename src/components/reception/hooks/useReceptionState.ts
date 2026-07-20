import { useState, useCallback } from 'react'
import type { ReceptionBeat, ReceptionData } from '../../../types/reception'

const ORDER: ReceptionBeat[] = [
  'bem-vinda',
  'sara-aparece',
  'capitulo-1',
  'capitulo-2',
  'capitulo-3',
  'preparando-tudo',
  'presente',
  'done',
]

export function useReceptionState() {
  const [beat, setBeat] = useState<ReceptionBeat>('bem-vinda')
  const [data, setData] = useState<ReceptionData>({ otherChildren: [] })

  const advance = useCallback(() => {
    setBeat((current) => {
      const i = ORDER.indexOf(current)
      return ORDER[Math.min(i + 1, ORDER.length - 1)]
    })
  }, [])

  const applyData = useCallback((patch: Partial<ReceptionData>) => {
    setData((prev) => ({ ...prev, ...patch }))
  }, [])

  return { beat, data, advance, applyData }
}
