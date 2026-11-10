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

export type TalkWho = "reserve" | "serving" | "pre";
const WHO_PARAM: Record<TalkWho, string> = {
  reserve: "1",
  serving: "0",
  pre: "pre",
};

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
  /** Newest first; `who` only 예비역's, 현역's or 입대 예정자's. */
  list(opts: { before?: string; who?: TalkWho; limit?: number } = {}) {
    const q = new URLSearchParams({
      kind: "talk",
      limit: `${opts.limit ?? 20}`,
    });
    if (opts.who) q.set("reserve", WHO_PARAM[opts.who]);
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
  /** A 댓글 under a thread, or a 대댓글 when `replyTo` is a 댓글. */
  async reply(input: {
    parentId: string;
    replyTo?: string | null;
    body: string;
    author: MemoryAuthor;
  }) {
    const data = await apiCall<{ post: Memory }>("/api/posts", {
      method: "POST",
      body: JSON.stringify({
        kind: "reply",
        parentId: input.parentId,
        replyTo: input.replyTo ?? null,
        body: input.body,
        ...input.author,
      }),
    });
    return data.post;
  },
};

/** A top-level 댓글 and the 대댓글 under it. `top` is null once deleted. */
export interface CommentGroup {
  id: string;
  top: Memory | null;
  answers: Memory[];
}

/** Replies, oldest first → each 댓글 followed by its 대댓글. */
export function groupReplies(replies: Memory[]): CommentGroup[] {
  const groups = new Map<string, CommentGroup>();
  for (const r of replies) {
    const id = r.replyTo ?? r.id;
    let g = groups.get(id);
    if (!g) {
      g = { id, top: null, answers: [] };
      groups.set(id, g);
    }
    if (r.replyTo) g.answers.push(r);
    else g.top = r;
  }
  return [...groups.values()];
}
