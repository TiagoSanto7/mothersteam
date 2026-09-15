import { X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { ApiCommunity } from '../../lib/types';

interface ShareVerseToCommunitySheetProps {
  onClose: () => void;
  onSelect: (communityId: string) => void;
}

/** Lista comunidades que o usuário participa; ao selecionar, abre editor de post nessa comunidade. */
export function ShareVerseToCommunitySheet({ onClose, onSelect }: ShareVerseToCommunitySheetProps) {
  const { data: communities = [], isLoading } = useQuery({
    queryKey: ['communities', 'includeMember'],
    queryFn: () => apiFetch<(ApiCommunity & { isMember: boolean })[]>('/communities?includeMember=1'),
  });

  const myCommunities = communities.filter((c) => c.isMember);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end z-[80]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Escolher comunidade"
        className="w-full bg-white rounded-t-3xl px-4 pt-4 max-w-[390px] mx-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-mt-charcoal">Escolha a comunidade</p>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <X size={14} className="text-mt-charcoal" />
          </button>
        </div>

        {isLoading ? (
          <p className="text-xs text-mt-muted text-center py-8">Carregando…</p>
        ) : myCommunities.length === 0 ? (
          <p className="text-xs text-mt-muted text-center py-8">
            Você ainda não faz parte de nenhuma comunidade. Entre em uma para poder compartilhar aqui.
          </p>
        ) : (
          <ul className="flex flex-col gap-1 max-h-72 overflow-y-auto">
            {myCommunities.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => onSelect(c.id)}
                  className="w-full flex items-center gap-3 px-2 py-3 rounded-xl active:bg-mt-linen transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-mt-linen flex items-center justify-center flex-shrink-0 text-xs font-bold text-mt-rose">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-semibold text-mt-charcoal truncate">{c.name}</p>
                    <p className="text-[11px] text-mt-muted truncate">{c._count.members} membros</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
