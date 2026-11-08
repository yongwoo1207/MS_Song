import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Memory, type NewMonthMemory, memoryStore } from "@/lib/memories";

/**
 * Records written to timeline months in a range, grouped by 'YYYY-MM',
 * plus add / delete / like.
 */
export function useTimeline(
  range: { from: string; to: string; cohort?: string } | null,
) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["timeline", range?.from, range?.to, range?.cohort ?? null],
    queryFn: () => memoryStore.listMonths(range!),
    enabled: !!range,
    staleTime: 30_000,
    retry: 1,
    select: (posts) => {
      const byMonth = new Map<string, Memory[]>();
      for (const p of posts) {
        if (!p.aboutMonth) continue;
        const list = byMonth.get(p.aboutMonth) ?? [];
        list.push(p);
        byMonth.set(p.aboutMonth, list);
      }
      return byMonth;
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["timeline"] });
  const add = useMutation({
    mutationFn: (m: NewMonthMemory) => memoryStore.addMonth(m),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (id: string) => memoryStore.remove(id),
    onSuccess: refresh,
  });
  const like = useMutation({
    mutationFn: (id: string) => memoryStore.toggleLike(id),
    onSuccess: refresh,
  });
  return {
    byMonth: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    add,
    remove,
    like,
  };
}
