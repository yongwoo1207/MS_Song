import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidatePosts } from "./postsCache";
import { memoryStore, type MemoryAuthor } from "@/lib/memories";
import type { EditPost } from "@shared/posts";
import { talkApi } from "@/lib/talks";

/** One 커뮤니티 글 with its 댓글, plus reply / edit / delete / like. */
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
  const edit = useMutation({
    mutationFn: ({ postId, ...input }: EditPost & { postId: string }) =>
      memoryStore.edit(postId, input),
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
    edit,
    remove,
    like,
  };
}
