import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidatePosts } from "./postsCache";
import { type Memory, memoryStore } from "@/lib/memories";

/**
 * Song memories filed under timeline months in a range, grouped by
 * 'YYYY-MM', plus delete / like.
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
        if (!p.aboutMonth || !p.song) continue;
        const list = byMonth.get(p.aboutMonth) ?? [];
        list.push(p);
        byMonth.set(p.aboutMonth, list);
      }
      return byMonth;
    },
  });
  const refresh = () => invalidatePosts(qc);
  const remove = useMutation({
    mutationFn: (id: string) => memoryStore.remove(id),
    onSuccess: refresh,
  });
  const like = useMutation({
    mutationFn: (id: string) => memoryStore.toggleLike(id),
    onSuccess: refresh,
  });
  return {
    songsByMonth: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    remove,
    like,
  };
}
