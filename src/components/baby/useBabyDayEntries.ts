import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import { localDayRange } from '../../lib/dateUtils';
import { useAppStore } from '../../store/useAppStore';
import type { ApiBabyEntry } from '../../lib/types';

const EMPTY_ENTRIES: ApiBabyEntry[] = [];

/** Baby entries created on the given local day (YYYY-MM-DD), newest first. */
export function useBabyDayEntries(day: string): ApiBabyEntry[] {
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);

  const { data } = useQuery({
    // Lives under ['baby'] so existing invalidateQueries({ queryKey: ['baby'] }) refreshes it.
    queryKey: ['baby', 'day', day],
    queryFn: () => {
      const { from, to } = localDayRange(day);
      return apiFetch<ApiBabyEntry[]>(
        `/baby?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
    },
    enabled: isLoggedIn,
  });

  return data ?? EMPTY_ENTRIES;
}

export type BabyEntryChanges = Partial<Pick<ApiBabyEntry, 'time' | 'detail' | 'createdAt'>>;

type Snapshot = [readonly unknown[], ApiBabyEntry[] | undefined][];

const byNewest = (a: ApiBabyEntry, b: ApiBabyEntry) => b.createdAt.localeCompare(a.createdAt);

/**
 * Edit/delete with optimistic updates: every cached ['baby', …] list changes at once,
 * rolls back if the API fails, and is refetched afterwards to settle with the server.
 */
export function useBabyEntryMutations({ onError }: { onError: (message: string) => void }) {
  const queryClient = useQueryClient();

  // Synchronous on purpose: the list must change in the same frame the sheet starts closing.
  function applyOptimistic(transform: (list: ApiBabyEntry[]) => ApiBabyEntry[]): Snapshot {
    void queryClient.cancelQueries({ queryKey: ['baby'] });
    const snapshot = queryClient.getQueriesData<ApiBabyEntry[]>({ queryKey: ['baby'] });
    for (const [key, list] of snapshot) {
      if (Array.isArray(list)) queryClient.setQueryData<ApiBabyEntry[]>(key, transform(list));
    }
    return snapshot;
  }

  function rollback(snapshot: Snapshot | undefined) {
    for (const [key, list] of snapshot ?? []) queryClient.setQueryData(key, list);
  }

  const settle = () => queryClient.invalidateQueries({ queryKey: ['baby'] });

  const update = useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: BabyEntryChanges }) =>
      apiFetch(`/baby/${id}`, { method: 'PATCH', body: JSON.stringify(changes) }),
    onMutate: ({ id, changes }) =>
      applyOptimistic((list) => list.map((e) => (e.id === id ? { ...e, ...changes } : e)).sort(byNewest)),
    onError: (_err, _vars, snapshot) => {
      rollback(snapshot);
      onError('Não foi possível salvar a alteração. O registro voltou como estava.');
    },
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/baby/${id}`, { method: 'DELETE' }),
    onMutate: (id) => applyOptimistic((list) => list.filter((e) => e.id !== id)),
    onError: (_err, _id, snapshot) => {
      rollback(snapshot);
      onError('Não foi possível excluir. O registro foi restaurado.');
    },
    onSettled: settle,
  });

  return {
    updateEntry: (id: string, changes: BabyEntryChanges) => update.mutate({ id, changes }),
    deleteEntry: (id: string) => remove.mutate(id),
  };
}
