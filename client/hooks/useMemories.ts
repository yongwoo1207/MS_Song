import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type NewMemory, memoryStore } from "@/lib/memories";

/** Memories for one song plus add / delete / like actions. */
export function useMemories(song: string | undefined) {
  const qc = useQueryClient();
  const key = ["memories", song];
  const list = useQuery({
    queryKey: key,
    queryFn: () => memoryStore.list(song!),
    enabled: !!song,
    staleTime: 30_000,
    retry: 1,
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["timeline"] });
  };

  const add = useMutation({
    mutationFn: (m: NewMemory) => memoryStore.add(m),
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
    memories: list.data ?? [],
    isLoading: list.isLoading,
    isError: list.isError,
    refetch: list.refetch,
    add,
    remove,
    like,
  };
}
