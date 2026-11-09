import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { invalidatePosts } from "./postsCache";
import { type FeedFilter, type NewPost, memoryStore } from "@/lib/memories";

/**
 * 커뮤니티: 커뮤니티 글 and song memories, newest first, 20 at a time,
 * plus write / delete / like.
 */
export function useCommunityFeed(filter: FeedFilter) {
  const qc = useQueryClient();
  const list = useInfiniteQuery({
    queryKey: ["song-feed", filter],
    queryFn: ({ pageParam }) => memoryStore.feed(filter, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next ?? undefined,
    staleTime: 30_000,
    retry: 1,
  });
  const refresh = () => invalidatePosts(qc);
  const add = useMutation({
    mutationFn: (p: NewPost) => memoryStore.addPost(p),
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
    posts: list.data?.pages.flatMap((p) => p.posts) ?? [],
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
