import { ArrowLeft, LogOut, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface ProfileScreenProps {
  onClose: () => void;
}

export function ProfileScreen({ onClose }: ProfileScreenProps) {
  const { motherName, motherProfile, logout, resetOnboarding } = useAppStore();
  const email = import.meta.env.VITE_NAVIGATION_USER as string;

  function handleLogout() {
    logout();
    onClose();
  }

  function handleResetOnboarding() {
    resetOnboarding();
    onClose();
  }

  const initial = motherName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#E8E4DF] flex items-center justify-center">
      <div className="relative w-[390px] h-[844px] bg-offwhite shadow-2xl overflow-hidden flex flex-col rounded-[2px] sm:rounded-[44px]">
        <div aria-hidden="true" className="h-11 flex-shrink-0 bg-white/80 backdrop-blur-sm" />

        <div className="flex items-center px-4 py-3 bg-white/80 border-b border-gray-100">
          <button
            onClick={onClose}
            aria-label="Voltar"
            className="w-9 h-9 rounded-xl bg-lavender-50 flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-lavender-600" strokeWidth={1.8} />
          </button>
          <h1 className="text-base font-semibold text-graphite ml-3">Meu Perfil</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-6 pb-8 flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-lavender-400 flex items-center justify-center text-3xl font-bold text-white shadow-md">
              {initial}
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-graphite">{motherName}</p>
              <p className="text-xs text-graphite-muted mt-0.5">{email}</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-lavender-100 text-lavender-600 text-xs font-medium">
              Plano Gratuito
            </span>
          </div>

          {motherProfile && (
            <div className="bg-lavender-50 rounded-3xl p-4 flex flex-col gap-2">
              <p className="text-xs font-semibold text-lavender-600 uppercase tracking-wide">Seu Perfil</p>
              <p className="text-sm font-medium text-graphite">{motherProfile.profileLabel}</p>
              <ul className="flex flex-col gap-1 mt-1">
                {motherProfile.insights.map((insight, i) => (
                  <li key={i} className="text-xs text-graphite-light flex items-start gap-2">
                    <span className="text-lavender-400 mt-0.5">•</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-graphite-muted uppercase tracking-wide px-1">
              Conta
            </p>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl shadow-sm text-sm text-graphite active:scale-95 transition-transform"
            >
              <LogOut size={16} className="text-graphite-muted" strokeWidth={1.8} />
              Sair da conta
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-graphite-muted uppercase tracking-wide px-1">
              Homologação
            </p>
            <button
              onClick={handleResetOnboarding}
              className="flex items-center gap-3 px-4 py-3.5 bg-white rounded-2xl shadow-sm text-sm text-graphite-muted active:scale-95 transition-transform border border-dashed border-gray-200"
            >
              <RefreshCw size={16} className="text-graphite-muted" strokeWidth={1.8} />
              <span>Resetar Onboarding</span>
              <span className="ml-auto text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-graphite-muted">
                teste
              </span>
            </button>
            <p className="text-[10px] text-graphite-muted px-1">
              Limpa as respostas do questionário e permite refazê-lo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
