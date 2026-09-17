import { useQuery } from '@tanstack/react-query';
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
