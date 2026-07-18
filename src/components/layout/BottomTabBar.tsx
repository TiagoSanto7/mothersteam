import { motion } from 'framer-motion';
import { Home, MessageCircle, Calendar, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getEvolutionEmoji } from '../../utils/pregnancyUtils';
import type { TabId } from '../../types';

function TabBtn({
  id, label, active, onClick, children,
}: {
  id: TabId; label: string; active: boolean; onClick: () => void; children: ReactNode;
}) {
  return (
    <button
      data-testid={`tab-${id}`}
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={`flex flex-col items-center gap-0.5 w-14 py-1 rounded-xl transition-colors ${
        active ? 'text-sara-gold' : 'text-graphite-muted'
      }`}
    >
      {children}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export function BottomTabBar() {
  const { activeTab, setActiveTab, phase } = useAppStore();

  return (
    <nav
      data-testid="bottom-tab-bar"
      className="flex-shrink-0 bg-sara-linen/90 backdrop-blur-md border-t border-white/40 flex items-center justify-around px-2 pt-1 pb-2 h-[68px]"
    >
      <TabBtn id="home" label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')}>
        <Home size={22} strokeWidth={1.8} />
      </TabBtn>

      <TabBtn id="maeIA" label="MãeIA" active={activeTab === 'maeIA'} onClick={() => setActiveTab('maeIA')}>
        <MessageCircle size={22} strokeWidth={1.8} />
      </TabBtn>

      <div className="flex flex-col items-center -translate-y-3">
        <motion.button
          data-testid="baby-central-button"
          onClick={() => setActiveTab('baby')}
          aria-label="Abrir rotina do bebê"
          aria-pressed={activeTab === 'baby'}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg shadow-sara-terracotta/30 transition-colors ${
            activeTab === 'baby'
              ? 'bg-sara-gold ring-2 ring-sara-terracotta ring-offset-2'
              : 'bg-sara-terracotta'
          }`}
        >
          {getEvolutionEmoji(phase)}
        </motion.button>
        <span className="text-[10px] font-medium text-graphite-muted mt-1">Bebê</span>
      </div>

      <TabBtn id="rotina" label="Rotina" active={activeTab === 'rotina'} onClick={() => setActiveTab('rotina')}>
        <Calendar size={22} strokeWidth={1.8} />
      </TabBtn>

      <TabBtn id="comunidade" label="Comunidade" active={activeTab === 'comunidade'} onClick={() => setActiveTab('comunidade')}>
        <Users size={22} strokeWidth={1.8} />
      </TabBtn>
    </nav>
  );
}
