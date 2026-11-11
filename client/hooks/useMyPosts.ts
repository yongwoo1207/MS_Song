import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ApiSongStats } from "@shared/posts";
import { type SongLikeInput, memoryStore } from "@/lib/memories";
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

const useSongStatsQuery = () =>
  useQuery({
    queryKey: ["song-counts"],
    queryFn: memoryStore.songStats,
    staleTime: 60_000,
    retry: false,
  });

/** song key → memories under it, for the chart lists. */
export function useSongCounts() {
  return useSongStatsQuery().data?.counts;
}

/** song key → hearts, and the songs I hearted. */
export function useSongLikes() {
  const data = useSongStatsQuery().data;
  return { likes: data?.likes ?? {}, liked: new Set(data?.liked ?? []) };
}

/** Heart / unheart a song, shown at once and then confirmed. */
export function useToggleSongLike() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (like: SongLikeInput) => memoryStore.toggleSongLike(like),
    onMutate: async ({ key }) => {
      await qc.cancelQueries({ queryKey: ["song-counts"] });
      const before = qc.getQueryData<ApiSongStats>(["song-counts"]);
      if (before) {
        const on = !before.liked.includes(key);
        qc.setQueryData<ApiSongStats>(["song-counts"], {
          ...before,
          liked: on
            ? [...before.liked, key]
            : before.liked.filter((k) => k !== key),
          likes: {
            ...before.likes,
            [key]: Math.max(0, (before.likes[key] ?? 0) + (on ? 1 : -1)),
          },
        });
      }
      return { before };
    },
    onError: (_err, _like, ctx) => {
      if (ctx?.before) qc.setQueryData(["song-counts"], ctx.before);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["song-counts"] });
      qc.invalidateQueries({ queryKey: ["song-feed"] }); // 음악 board
    },
  });
}
