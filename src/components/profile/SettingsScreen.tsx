import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface SettingsScreenProps {
  onBack: () => void;
  onClose: () => void;
}

export function SettingsScreen({ onBack, onClose }: SettingsScreenProps) {
  const { motherName, logout, resetOnboarding } = useAppStore((s) => ({
    motherName: s.motherName,
    logout: s.logout,
    resetOnboarding: s.resetOnboarding,
  }));

  const [notifLikes, setNotifLikes] = useState(true);
  const [notifPosts, setNotifPosts] = useState(false);

  function handleLogout() {
    logout();
    onClose();
  }

  function handleReset() {
    resetOnboarding();
    onClose();
  }

  return (
    <div className="flex flex-col h-full bg-offwhite">
      <div className="flex items-center gap-3 px-4 pt-6 pb-4 border-b border-gray-100">
        <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-lavender-50">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <h1 className="text-base font-semibold text-graphite">Configurações</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6">
        <section>
          <p className="text-[10px] font-semibold text-graphite-muted uppercase tracking-wide mb-2 px-1">Conta</p>
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-xs text-graphite-muted">Nome</p>
                <p className="text-sm font-medium text-graphite">{motherName}</p>
              </div>
              <span className="text-[10px] text-graphite-muted bg-gray-100 rounded-full px-2 py-0.5">em breve</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-xs text-graphite-muted">E-mail</p>
                <p className="text-sm font-medium text-graphite">navegador@mothersteam</p>
              </div>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-xs text-graphite-muted">Plano</p>
                <p className="text-sm font-medium text-graphite">Gratuito</p>
              </div>
              <button className="text-[10px] text-lavender-600 font-semibold flex items-center gap-0.5">
                ver planos <ChevronRight size={12} />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-3">
            <button
              onClick={handleLogout}
              className="w-full py-3 rounded-2xl bg-white border border-gray-200 text-sm font-medium text-graphite-light active:scale-95 transition-transform"
            >
              Sair da conta
            </button>
            <button
              onClick={handleReset}
              className="w-full py-3 rounded-2xl bg-white border border-dashed border-gray-300 text-sm font-medium text-graphite-muted active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              Resetar Onboarding
              <span className="text-[9px] bg-gray-100 text-graphite-muted px-1.5 py-0.5 rounded-full font-semibold">teste</span>
            </button>
          </div>
        </section>

        <section>
          <p className="text-[10px] font-semibold text-graphite-muted uppercase tracking-wide mb-2 px-1">Notificações</p>
          <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-100">
            <div className="flex items-center justify-between px-4 py-3.5">
              <p className="text-sm text-graphite">Curtidas e comentários</p>
              <button
                onClick={() => setNotifLikes(!notifLikes)}
                className={`w-10 h-6 rounded-full transition-colors relative ${notifLikes ? 'bg-lavender-600' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifLikes ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center justify-between px-4 py-3.5">
              <p className="text-sm text-graphite">Novas publicações</p>
              <button
                onClick={() => setNotifPosts(!notifPosts)}
                className={`w-10 h-6 rounded-full transition-colors relative ${notifPosts ? 'bg-lavender-600' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifPosts ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
          </div>
        </section>

        <section>
          <p className="text-[10px] font-semibold text-graphite-muted uppercase tracking-wide mb-2 px-1">Sobre</p>
          <div className="bg-white rounded-2xl px-4 py-3">
            <p className="text-sm text-graphite-muted">Versão 1.0.0 · Mothers Team</p>
          </div>
        </section>
      </div>
    </div>
  );
}
