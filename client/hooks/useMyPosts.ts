import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { memoryStore } from "@/lib/memories";
import { invalidatePosts } from "./postsCache";

/** Everything written from this device, plus delete. */
export function useMyPosts() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ["my-posts"],
    queryFn: memoryStore.listMine,
    staleTime: 0,
    retry: 1,
  });
  const remove = useMutation({
    mutationFn: (id: string) => memoryStore.remove(id),
    onSuccess: () => invalidatePosts(qc),
  });
  return {
    posts: list.data ?? [],
    isLoading: list.isLoading,
    isError: list.isError,
    refetch: list.refetch,
    remove,
  };
}

/** song key → memories under it, for the chart lists. */
export function useSongCounts() {
  const query = useQuery({
    queryKey: ["song-counts"],
    queryFn: memoryStore.songCounts,
    staleTime: 60_000,
    retry: false,
  });
  return query.data;
}
