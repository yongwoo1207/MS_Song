import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { invalidatePosts } from "./postsCache";
import { type NewMemory, memoryStore } from "@/lib/memories";

/**
 * Memories for one song, newest first, 20 at a time (`loadMore` for the
 * next page), plus add / delete / like actions.
 */
export function useMemories(song: string | undefined) {
  const qc = useQueryClient();
  const list = useInfiniteQuery({
    queryKey: ["memories", song],
    queryFn: ({ pageParam }) => memoryStore.list(song!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next ?? undefined,
    enabled: !!song,
    staleTime: 30_000,
    retry: 1,
  });
  const refresh = () => invalidatePosts(qc);

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
    memories: list.data?.pages.flatMap((p) => p.posts) ?? [],
    isLoading: list.isLoading,
    isError: list.isError,
    refetch: list.refetch,
    hasMore: list.hasNextPage,
    loadingMore: list.isFetchingNextPage,
    loadMore: () => list.fetchNextPage(),
    add,
    remove,
    like,
  };
}
