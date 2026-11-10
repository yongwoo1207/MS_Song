/**
 * 선후임 소통: 현역 and 예비역 write to each other and reply under a post.
 * Served by the Worker's /api/posts (kind talk / reply).
 */
import {
  type PostRank,
  TALK_MAX_LENGTH,
  REPLY_MAX_LENGTH,
} from "@shared/posts";
import {
  type Memory,
  type MemoryAuthor,
  type MemoryPage,
  apiCall,
} from "./memories";

export { TALK_MAX_LENGTH, REPLY_MAX_LENGTH };

export interface Thread {
  post: Memory;
  replies: Memory[];
}

const page = async (q: URLSearchParams): Promise<MemoryPage> => {
  const data = await apiCall<{ posts: Memory[]; next?: string | null }>(
    `/api/posts?${q}`,
  );
  return { posts: data.posts, next: data.next ?? null };
};

export const talkApi = {
  /** Newest first; `reserve` true only by 예비역, false only by 현역. */
  list(opts: { before?: string; reserve?: boolean; limit?: number } = {}) {
    const q = new URLSearchParams({
      kind: "talk",
      limit: `${opts.limit ?? 20}`,
    });
    if (opts.reserve !== undefined) q.set("reserve", opts.reserve ? "1" : "0");
    if (opts.before) q.set("before", opts.before);
    return page(q);
  },
  thread(id: string) {
    return apiCall<Thread>(`/api/posts/${encodeURIComponent(id)}`);
  },
  async ask(input: {
    title: string;
    body: string;
    rank: PostRank | null;
    author: MemoryAuthor;
  }) {
    const data = await apiCall<{ post: Memory }>("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        kind: "talk",
        title: input.title,
        body: input.body,
        rank: input.rank,
        ...input.author,
      }),
    });
    return data.post;
  },
  async reply(input: { parentId: string; body: string; author: MemoryAuthor }) {
    const data = await apiCall<{ post: Memory }>("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        kind: "reply",
        parentId: input.parentId,
        body: input.body,
        ...input.author,
      }),
    });
    return data.post;
  },
};
