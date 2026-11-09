/**
 * Memories (records): short posts about what a song meant to someone in
 * service. The timeline shows them under the chart month they came from. Stored in Cloudflare D1 behind the Worker's
 * /api/posts (worker/index.ts); the UI only talks to `memoryStore`.
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
import { deviceToken } from "./device";

export type Memory = ApiPost;

/** Who is writing, as shown on the post. */
export interface MemoryAuthor {
  cohortMonth: string; // 'YYYY-MM'
  branch: PostBranch;
  isReserve: boolean;
}

export interface NewMemory {
  song: SongRef;
  body: string;
  rank: PostRank;
  aboutMonth: string; // 'YYYY-MM'
  author: MemoryAuthor;
}

export interface MonthRange {
  from: string; // 'YYYY-MM'
  to: string;
  cohort?: string; // only this 군번
}

/** One page of a song's memories; `next` fetches the following one. */
export interface MemoryPage {
  posts: Memory[];
  next: string | null;
}

export const MEMORY_PAGE = 20;

/** A 커뮤니티 글: which 시절 it is about, no song. */
export interface NewPost {
  body: string;
  rank: PostRank;
  author: MemoryAuthor;
}

/** 커뮤니티 filter: one rank's posts, or only 예비역's. */
export type FeedFilter = PostRank | "예비역" | null;

export interface MemoryStore {
  list(songKey: string, before?: string): Promise<MemoryPage>;
  /** 커뮤니티 글 and song memories, newest first. */
  feed(filter: FeedFilter, before?: string): Promise<MemoryPage>;
  /** A 커뮤니티 글, on no song. */
  addPost(input: NewPost): Promise<Memory>;
  listMonths(range: MonthRange): Promise<Memory[]>;
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
export { COMMUNITY_MAX_LENGTH } from "@shared/posts";

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
  async feed(filter, before) {
    const q = new URLSearchParams({
      feed: "community",
      limit: `${MEMORY_PAGE}`,
    });
    if (filter === "예비역") q.set("reserve", "1");
    else if (filter) q.set("rank", filter);
    if (before) q.set("before", before);
    const data = await call<{ posts: Memory[]; next?: string | null }>(`?${q}`);
    return { posts: data.posts, next: data.next ?? null };
  },
  async addPost({ body, rank, author }) {
    const data = await call<{ post: Memory }>("", {
      method: "POST",
      body: JSON.stringify({ kind: "post", body, rank, ...author }),
    });
    return data.post;
  },
  async listMonths({ from, to, cohort }) {
    const q = new URLSearchParams({ from, to });
    if (cohort) q.set("cohort", cohort);
    const data = await call<{ posts: Memory[] }>(`?${q}`);
    return data.posts;
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

/** '2021-03' → "2021년 3월" */
export function monthLabel(month: string) {
  const [y, m] = month.split("-");
  return `${y}년 ${Number(m)}월`;
}

/** Where a post lives, e.g. "♪ LOVE DIVE · IVE", "일병 시절 · 커뮤니티 글". */
export function postContext(p: Pick<Memory, "kind" | "song" | "rank">): string {
  if (p.song) return `♪ ${p.song.title} · ${p.song.artist}`;
  if (p.kind === "post") return `${p.rank ?? ""} 시절 · 커뮤니티 글`;
  if (p.kind === "talk") return "선후임 소통 글";
  if (p.kind === "reply") return "선후임 소통 답글";
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
