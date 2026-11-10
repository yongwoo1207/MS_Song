import type { QueryClient } from "@tanstack/react-query";

/** Every cached list a post can show up in. */
const POST_QUERIES = [
  "memories",
  "song-counts",
  "my-posts",
  "song-feed",
  "talks",
  "talk",
] as const;

/** Refetch them all after writing, deleting or liking a post. */
export function invalidatePosts(qc: QueryClient) {
  for (const key of POST_QUERIES) qc.invalidateQueries({ queryKey: [key] });
}
