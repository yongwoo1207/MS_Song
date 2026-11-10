import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { invalidatePosts } from "./postsCache";
import { memoryStore, type MemoryAuthor } from "@/lib/memories";
import { type TalkWho, talkApi } from "@/lib/talks";
import type { PostRank } from "@shared/posts";

/**
 * 선후임 소통 글, newest first, 20 at a time. `who`: only 예비역's, 현역's
 * or 입대 예정자's; undefined all.
 */
export function useTalks({
  who,
  limit,
}: { who?: TalkWho; limit?: number } = {}) {
  const qc = useQueryClient();
  const list = useInfiniteQuery({
    queryKey: ["talks", who ?? "all", limit ?? 20],
    queryFn: ({ pageParam }) => talkApi.list({ who, limit, before: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.next ?? undefined,
    staleTime: 30_000,
    retry: 1,
  });
  const ask = useMutation({
    mutationFn: (input: {
      title: string;
      body: string;
      rank: PostRank | null;
      author: MemoryAuthor;
    }) => talkApi.ask(input),
    onSuccess: () => invalidatePosts(qc),
  });
  return {
    talks: list.data?.pages.flatMap((p) => p.posts) ?? [],
    isLoading: list.isLoading,
    isError: list.isError,
    refetch: list.refetch,
    hasMore: list.hasNextPage,
    loadingMore: list.isFetchingNextPage,
    loadMore: () => list.fetchNextPage(),
    ask,
  };
}

/** One 커뮤니티 글 or 소통 글 with its 댓글, plus reply / delete / like. */
export function useThread(id: string | undefined) {
  const qc = useQueryClient();
  const thread = useQuery({
    queryKey: ["talk", id],
    queryFn: () => talkApi.thread(id!),
    enabled: !!id,
    staleTime: 15_000,
    retry: (count, err) => count < 1 && !/찾을 수 없/.test(err.message),
  });
  const refresh = () => invalidatePosts(qc);
  const reply = useMutation({
    mutationFn: (input: {
      body: string;
      author: MemoryAuthor;
      replyTo?: string | null;
    }) => talkApi.reply({ parentId: id!, ...input }),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (postId: string) => memoryStore.remove(postId),
    onSuccess: refresh,
  });
  const like = useMutation({
    mutationFn: (postId: string) => memoryStore.toggleLike(postId),
    onSuccess: refresh,
  });
  return {
    post: thread.data?.post,
    replies: thread.data?.replies ?? [],
    isLoading: thread.isLoading,
    isError: thread.isError,
    error: thread.error,
    refetch: thread.refetch,
    reply,
    remove,
    like,
  };
}
