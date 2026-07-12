import { useEffect, useState } from 'react';
import { ChevronLeft, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

interface SearchResults {
  users: Array<{ id: string; name: string; pregnancyStage: string }>;
  communities: Array<{ id: string; name: string; description: string; category: string; colorKey: string; _count: { members: number } }>;
}

interface SearchScreenProps {
  onOpenUser: (id: string) => void;
  onOpenCommunity: (id: string) => void;
  onBack: () => void;
}

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function SearchScreen({ onOpenUser, onOpenCommunity, onBack }: SearchScreenProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query.trim(), 200);

  const { data } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => apiFetch<SearchResults>(`/search?q=${encodeURIComponent(debouncedQuery)}`),
    enabled: debouncedQuery.length >= 2,
  });

  const users = data?.users ?? [];
  const communities = data?.communities ?? [];

  return (
    <div className="flex flex-col w-full h-full sm:w-[390px] sm:h-[844px] bg-gradient-to-b from-[#F5EDE0] via-[#EAD8C8] to-[#D9C4AF] sm:rounded-[44px] sm:shadow-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-6 pb-3 flex-shrink-0">
        <button onClick={onBack} aria-label="Voltar" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-sara-linen">
          <ChevronLeft size={20} className="text-graphite" />
        </button>
        <div className="flex-1 flex items-center gap-2 bg-white rounded-2xl border border-sara-linen px-3 py-2">
          <Search size={16} className="text-graphite-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pessoas e comunidades"
            aria-label="Buscar pessoas e comunidades"
            className="flex-1 bg-transparent text-sm text-graphite placeholder:text-sara-muted outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {users.length > 0 && (
          <section>
            <h2 className="text-[10px] font-semibold text-graphite-muted uppercase tracking-wide px-4 py-2">Pessoas</h2>
            <ul className="divide-y divide-gray-100">
              {users.map((u) => (
                <li key={u.id}>
                  <button onClick={() => onOpenUser(u.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                    <div className="w-10 h-10 rounded-full bg-sara-terracotta flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm font-semibold text-graphite">{u.name}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {communities.length > 0 && (
          <section>
            <h2 className="text-[10px] font-semibold text-graphite-muted uppercase tracking-wide px-4 py-2">Comunidades</h2>
            <ul className="divide-y divide-gray-100">
              {communities.map((c) => (
                <li key={c.id}>
                  <button onClick={() => onOpenCommunity(c.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
                    <div className="w-10 h-10 rounded-2xl bg-sara-gold flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-graphite">{c.name}</p>
                      <p className="text-[11px] text-graphite-muted">{c._count.members} membros</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {debouncedQuery.length >= 2 && users.length === 0 && communities.length === 0 && (
          <p className="text-sm text-graphite-muted text-center py-8">Nada encontrado para "{debouncedQuery}"</p>
        )}
      </div>
    </div>
  );
}
