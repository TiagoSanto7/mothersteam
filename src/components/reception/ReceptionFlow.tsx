import { useAppStore } from '../../store/useAppStore'
import { useReceptionState } from './hooks/useReceptionState'
import { BemVinda } from './beats/BemVinda'
import { SaraAparece } from './beats/SaraAparece'
import { SaraBoasVindas } from './beats/SaraBoasVindas'
import { PreparandoTudo } from './beats/PreparandoTudo'
import { Presente } from './beats/Presente'

export function ReceptionFlow() {
  const { beat, advance } = useReceptionState()
  const motherName = useAppStore((s) => s.motherName)
  const mood = useAppStore((s) => s.mood)

  switch (beat) {
    case 'bem-vinda':
      return <BemVinda onContinue={advance} />
    case 'sara-aparece':
      return <SaraAparece motherName={motherName} onContinue={advance} />
    case 'sara-boas-vindas':
      return <SaraBoasVindas motherName={motherName} onComplete={advance} />
    case 'preparando-tudo':
      return <PreparandoTudo mood={mood} onReady={advance} />
    case 'presente':
      return <Presente mood={mood} onEnter={advance} />
    case 'done':
      return null
  }
}
