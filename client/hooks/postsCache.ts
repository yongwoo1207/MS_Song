import type { QueryClient } from "@tanstack/react-query";

/** Every cached list a post can show up in. */
const POST_QUERIES = [
  "memories",
  "timeline",
  "letters",
  "song-counts",
  "my-posts",
] as const;

/** Refetch them all after writing, deleting or liking a post. */
export function invalidatePosts(qc: QueryClient) {
  for (const key of POST_QUERIES) qc.invalidateQueries({ queryKey: [key] });
}
