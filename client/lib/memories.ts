/**
 * Memories (records): short posts about what a song meant to someone in
 * service, gathered in 커뮤니티 > 음악. Stored in Cloudflare D1 behind the
 * Worker's /api/posts (worker/index.ts); the UI only talks to `memoryStore`.
 */
import { format } from "date-fns";
import {
  type ApiPost,
  type ApiSongStats,
  DEVICE_HEADER,
  type PostBranch,
  type PostRank,
  RECORD_MAX_LENGTH,
  type SongRef,
} from "@shared/posts";
import { ddayStatus } from "./dday";
import { deviceToken } from "./device";
import type { ServicePlan } from "./service";

export type Memory = ApiPost;

/** Who is writing, as shown on the post. */
export interface MemoryAuthor {
  cohortMonth: string; // 'YYYY-MM'
  branch: PostBranch;
  isReserve: boolean;
  /** 입대 예정자: days left to 입대. null once enlisted. */
  daysToEnlist: number | null;
}

export interface NewMemory {
  song: SongRef;
  body: string;
  rank: PostRank;
  aboutMonth: string; // 'YYYY-MM'
  author: MemoryAuthor;
}

/** One page of a song's memories; `next` fetches the following one. */
export interface MemoryPage {
  posts: Memory[];
  next: string | null;
}

export const MEMORY_PAGE = 20;

/** A 커뮤니티 글: a free post with a title, no song. */
export interface NewPost {
  title: string;
  body: string;
  rank: PostRank | null; // the writer's rank now (null for 예비역)
  author: MemoryAuthor;
}

/** 커뮤니티 filter: one rank's posts, or only 예비역's. */
export type FeedFilter = PostRank | "예비역" | null;

/** 커뮤니티 board: 이야기 (커뮤니티 글) or 음악 (memories under songs). */
export type FeedTopic = "story" | "music";

export interface MemoryStore {
  list(songKey: string, before?: string): Promise<MemoryPage>;
  /** One 커뮤니티 board, newest first. */
  feed(
    topic: FeedTopic,
    filter: FeedFilter,
    before?: string,
  ): Promise<MemoryPage>;
  /** A 커뮤니티 글, on no song. */
  addPost(input: NewPost): Promise<Memory>;
  add(input: NewMemory): Promise<Memory>;
  remove(id: string): Promise<void>;
  toggleLike(id: string): Promise<{ liked: boolean; likes: number }>;
  /** Everything written from this device, hidden ones too. */
  listMine(): Promise<Memory[]>;
  /** memories and hearts per song key */
  songStats(): Promise<ApiSongStats>;
  toggleSongLike(key: string): Promise<{ liked: boolean; likes: number }>;
}

export const MEMORY_MAX_LENGTH = RECORD_MAX_LENGTH;
export { COMMUNITY_MAX_LENGTH, TITLE_MAX_LENGTH } from "@shared/posts";

/** fetch against the Worker API with the device token; throws its error. */
export async function apiCall<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "content-type": "application/json",
        [DEVICE_HEADER]: deviceToken(),
        ...init.headers,
      },
    });
  } catch {
    throw new Error("인터넷 연결을 확인해주세요");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? "잠시 후 다시 시도해주세요");
  return data as T;
}

const call = <T>(path: string, init?: RequestInit) =>
  apiCall<T>(`/api/posts${path}`, init);

export const apiMemoryStore: MemoryStore = {
  async list(songKey, before) {
    const q = new URLSearchParams({ song: songKey, limit: `${MEMORY_PAGE}` });
    if (before) q.set("before", before);
    const data = await call<{ posts: Memory[]; next?: string | null }>(`?${q}`);
    return { posts: data.posts, next: data.next ?? null };
  },
  async feed(topic, filter, before) {
    const q = new URLSearchParams({
      feed: topic,
      limit: `${MEMORY_PAGE}`,
    });
    if (filter === "예비역") q.set("reserve", "1");
    else if (filter) q.set("rank", filter);
    if (before) q.set("before", before);
    const data = await call<{ posts: Memory[]; next?: string | null }>(`?${q}`);
    return { posts: data.posts, next: data.next ?? null };
  },
  async addPost({ title, body, rank, author }) {
    const data = await call<{ post: Memory }>("", {
      method: "POST",
      body: JSON.stringify({ kind: "post", title, body, rank, ...author }),
    });
    return data.post;
  },
  async add({ song, body, rank, aboutMonth, author }) {
    const data = await call<{ post: Memory }>("", {
      method: "POST",
      body: JSON.stringify({
        kind: "record",
        song,
        body,
        rank,
        aboutMonth,
        ...author,
      }),
    });
    return data.post;
  },
  async remove(id) {
    await call(`/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  toggleLike(id) {
    return call(`/${encodeURIComponent(id)}/like`, { method: "POST" });
  },
  async listMine() {
    const data = await apiCall<{ posts: Memory[] }>("/api/me/posts");
    return data.posts;
  },
  async songStats() {
    const data = await apiCall<Partial<ApiSongStats>>("/api/song-counts");
    return {
      counts: data.counts ?? {},
      likes: data.likes ?? {},
      liked: data.liked ?? [],
    };
  },
  toggleSongLike(key) {
    return apiCall("/api/songs/like", {
      method: "POST",
      body: JSON.stringify({ key }),
    });
  },
};

export const memoryStore: MemoryStore = apiMemoryStore;

/** Enlistment day → '2021-10' */
export const cohortMonthOf = (enlist: Date) => format(enlist, "yyyy-MM");

/** Chart key '2022-1' (or a Date) → '2022-01' */
export function monthParam(month: string | Date): string {
  if (month instanceof Date) return format(month, "yyyy-MM");
  const [y, m] = month.split("-");
  return `${y}-${m.padStart(2, "0")}`;
}

/** '2021-10' → "2021년 10월 군번" */
export function cohortLabel(cohortMonth: string) {
  const [y, m] = cohortMonth.split("-");
  return `${y}년 ${Number(m)}월 군번`;
}

/** Who is writing now, from the service plan. */
export function writerOf(plan: ServicePlan, now = new Date()): MemoryAuthor {
  const status = ddayStatus(plan, now);
  return {
    cohortMonth: cohortMonthOf(plan.enlist),
    branch: plan.branch,
    isReserve: status.status === "done",
    daysToEnlist: status.status === "notYet" ? status.daysLeft : null,
  };
}

/** 23 → "입대 23일 전" */
export const preEnlistLabel = (days: number) =>
  days > 0 ? `입대 ${days}일 전` : "입대 당일";

/**
 * Who wrote a post, as shown on it: "2023년 5월 군번 · 육군 · 일병",
 * "… · 예비역", or "입대 23일 전 · 육군" for a 입대 예정자.
 */
export function authorLine(
  m: Pick<Memory, "cohortMonth" | "branch" | "isReserve"> & {
    daysToEnlist?: number | null;
    rank?: PostRank | null;
  },
) {
  if (m.daysToEnlist != null)
    return `${preEnlistLabel(m.daysToEnlist)} · ${m.branch}`;
  const role = m.isReserve ? "예비역" : (m.rank ?? "현역");
  return `${cohortLabel(m.cohortMonth)} · ${m.branch} · ${role}`;
}

/** '2021-03' → "2021년 3월" */
export function monthLabel(month: string) {
  const [y, m] = month.split("-");
  return `${y}년 ${Number(m)}월`;
}

/** Where a post lives, e.g. "♪ LOVE DIVE · IVE", "커뮤니티 · 휴가 계획". */
export function postContext(
  p: Pick<Memory, "kind" | "song" | "title" | "replyTo">,
): string {
  if (p.song) return `♪ ${p.song.title} · ${p.song.artist}`;
  if (p.kind === "post")
    return p.title ? `커뮤니티 · ${p.title}` : "커뮤니티 글";
  if (p.kind === "talk") return "선후임 소통 글";
  if (p.kind === "reply") return p.replyTo ? "답글" : "댓글";
  return "";
}

/** "방금 전", "5분 전", "3시간 전", "2일 전", then the date */
export function timeAgo(iso: string, now = new Date()): string {
  const diff = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}일 전`;
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}
