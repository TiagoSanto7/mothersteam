import { Home, BookOpen, Users, User } from 'lucide-react'
import { Mark } from '../brand/Mark'

export type MtTabId = 'hoje' | 'jornada' | 'comunidade' | 'perfil'

interface MtBottomNavProps {
  activeTab: MtTabId
  onTabChange: (tab: MtTabId) => void
  onCtaClick: () => void
}

interface TabDef {
  id: MtTabId
  label: string
  Icon: typeof Home
}

const TABS: TabDef[] = [
  { id: 'hoje',       label: 'Hoje',       Icon: Home },
  { id: 'jornada',    label: 'Jornada',    Icon: BookOpen },
  { id: 'comunidade', label: 'Comunidade', Icon: Users },
  { id: 'perfil',     label: 'Perfil',     Icon: User },
]

export function MtBottomNav({ activeTab, onTabChange, onCtaClick }: MtBottomNavProps) {
  // Visual order: Hoje | Jornada | [M-CTA] | Comunidade | Perfil
  const left = TABS.slice(0, 2)
  const right = TABS.slice(2)

  return (
    <nav
      role="tablist"
      className="fixed bottom-0 left-0 right-0 z-40 mx-4 mb-2 bg-white/95 backdrop-blur-sm rounded-mt-lg shadow-mt-lg flex items-end justify-around px-4"
      style={{
        paddingBottom: `calc(env(safe-area-inset-bottom) + 12px)`,
        paddingTop: '10px',
      }}
    >
      {left.map(({ id, label, Icon }) => (
        <TabButton key={id} id={id} label={label} Icon={Icon} active={activeTab === id} onClick={() => onTabChange(id)} />
      ))}

      <button
        type="button"
        onClick={onCtaClick}
        aria-label="Ações rápidas"
        className="-mt-6 rounded-full shadow-mt-lg focus:outline-none focus:ring-2 focus:ring-mt-rose"
      >
        <Mark variant="gradient" size={56} aria-label="Ações rápidas" />
      </button>

      {right.map(({ id, label, Icon }) => (
        <TabButton key={id} id={id} label={label} Icon={Icon} active={activeTab === id} onClick={() => onTabChange(id)} />
      ))}
    </nav>
  )
}

function TabButton({
  id, label, Icon, active, onClick,
}: {
  id: string
  label: string
  Icon: typeof Home
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-label={label}
      aria-selected={active}
      onClick={onClick}
      data-testid={`mt-tab-${id}`}
      className={`flex flex-col items-center gap-0.5 py-1 px-2 focus:outline-none ${active ? 'text-mt-rose' : 'text-mt-muted'}`}
    >
      <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}
