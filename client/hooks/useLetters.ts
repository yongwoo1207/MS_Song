import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invalidatePosts } from "./postsCache";
import { type HobongSlot, type NewLetter, memoryStore } from "@/lib/memories";

/**
 * 한마디 left for one 계급·호봉 ("mine": only my own, across all of them),
 * plus add / delete / like.
 */
export function useLetters(slot: HobongSlot | "mine" | null) {
  const qc = useQueryClient();
  const key =
    slot === "mine"
      ? ["letters", "mine"]
      : ["letters", slot?.rank, slot?.hobong];
  const list = useQuery({
    queryKey: key,
    queryFn: () =>
      slot === "mine"
        ? memoryStore.listMyLetters()
        : memoryStore.listLetters(slot!),
    enabled: !!slot,
    staleTime: 30_000,
    retry: 1,
  });
  const refresh = () => invalidatePosts(qc);

  const add = useMutation({
    mutationFn: (l: NewLetter) => memoryStore.addLetter(l),
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
    letters: list.data ?? [],
    isLoading: list.isLoading,
    isError: list.isError,
    refetch: list.refetch,
    add,
    remove,
    like,
  };
}
