/**
 * A 커뮤니티 글 or 선후임 소통 글 with its 댓글 and 대댓글. Served by the
 * Worker's /api/posts (kind reply). Lists live on the 커뮤니티 board
 * (memoryStore.feed).
 */
import { TALK_MAX_LENGTH, REPLY_MAX_LENGTH } from "@shared/posts";
import { type Memory, type MemoryAuthor, apiCall } from "./memories";

export { TALK_MAX_LENGTH, REPLY_MAX_LENGTH };

export interface Thread {
  post: Memory;
  replies: Memory[];
}

export const talkApi = {
  thread(id: string) {
    return apiCall<Thread>(`/api/posts/${encodeURIComponent(id)}`);
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
