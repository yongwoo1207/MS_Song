import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidatePosts } from "./postsCache";
import { type Memory, type NewMonthMemory, memoryStore } from "@/lib/memories";

/**
 * Records written to timeline months in a range and song memories filed
 * under them, each grouped by 'YYYY-MM', plus add / delete / like.
 */
export function useTimeline(
  range: { from: string; to: string; cohort?: string } | null,
) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["timeline", range?.from, range?.to, range?.cohort ?? null],
    queryFn: () => memoryStore.listMonths({ ...range!, songs: true }),
    enabled: !!range,
    staleTime: 30_000,
    retry: 1,
    select: (posts) => {
      const records = new Map<string, Memory[]>();
      const songs = new Map<string, Memory[]>();
      for (const p of posts) {
        if (!p.aboutMonth) continue;
        const into = p.song ? songs : records;
        const list = into.get(p.aboutMonth) ?? [];
        list.push(p);
        into.set(p.aboutMonth, list);
      }
      return { records, songs };
    },
  });
  const refresh = () => invalidatePosts(qc);
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
    byMonth: query.data?.records,
    songsByMonth: query.data?.songs,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    add,
    remove,
    like,
  };
}
