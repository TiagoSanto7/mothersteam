import { useCallback } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useReceptionState } from './hooks/useReceptionState'
import { BemVinda } from './beats/BemVinda'
import { SaraAparece } from './beats/SaraAparece'
import { Capitulo1 } from './beats/Capitulo1'
import { Capitulo2 } from './beats/Capitulo2'
import { Capitulo3 } from './beats/Capitulo3'
import { PreparandoTudo } from './beats/PreparandoTudo'
import { Presente } from './beats/Presente'
import type { ReceptionData } from '../../types/reception'

export function ReceptionFlow() {
  const { beat, data, advance, applyData } = useReceptionState()
  const motherName = useAppStore((s) => s.motherName)

  const advanceWithData = useCallback(
    (patch: Partial<ReceptionData>) => {
      applyData(patch)
      advance()
    },
    [applyData, advance],
  )

  switch (beat) {
    case 'bem-vinda':
      return <BemVinda onContinue={advance} />
    case 'sara-aparece':
      return <SaraAparece motherName={motherName} onContinue={advance} />
    case 'capitulo-1':
      return <Capitulo1 onComplete={advanceWithData} />
    case 'capitulo-2':
      return <Capitulo2 onComplete={advanceWithData} />
    case 'capitulo-3':
      return <Capitulo3 onComplete={advanceWithData} />
    case 'preparando-tudo':
      return <PreparandoTudo data={data} onReady={advance} />
    case 'presente':
      return <Presente mood={data.mood} onEnter={advance} />
    case 'done':
      return null
  }
}
