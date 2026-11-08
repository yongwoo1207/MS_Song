/**
 * Memories (records): short posts about what a song meant to someone in
 * service, or what a month of service was like (timeline). Stored in Cloudflare D1 behind the Worker's
 * /api/posts (worker/index.ts); the UI only talks to `memoryStore`.
 */
import { format } from "date-fns";
import {
  type ApiPost,
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

/** A record written straight to a timeline month. */
export interface NewMonthMemory {
  aboutMonth: string; // 'YYYY-MM'
  body: string;
  rank: PostRank;
  hobong?: number;
  author: MemoryAuthor;
}

/** A 계급·호봉 slot: 한마디 written for it show to whoever is there later. */
export interface HobongSlot {
  rank: PostRank;
  hobong: number;
}

/** A 한마디 for the next people at a 계급·호봉. */
export interface NewLetter extends HobongSlot {
  body: string;
  author: MemoryAuthor;
}

export interface MonthRange {
  from: string; // 'YYYY-MM'
  to: string;
  cohort?: string; // only this 군번
}

export interface MemoryStore {
  list(songKey: string): Promise<Memory[]>;
  listMonths(range: MonthRange): Promise<Memory[]>;
  add(input: NewMemory): Promise<Memory>;
  addMonth(input: NewMonthMemory): Promise<Memory>;
  listLetters(slot: HobongSlot): Promise<Memory[]>;
  /** My own 한마디 across every 계급·호봉. */
  listMyLetters(): Promise<Memory[]>;
  addLetter(input: NewLetter): Promise<Memory>;
  remove(id: string): Promise<void>;
  toggleLike(id: string): Promise<{ liked: boolean; likes: number }>;
}

export const MEMORY_MAX_LENGTH = RECORD_MAX_LENGTH;
export { LETTER_MAX_LENGTH, LETTERS_PER_SLOT } from "@shared/posts";

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
  async list(songKey) {
    const data = await call<{ posts: Memory[] }>(
      `?song=${encodeURIComponent(songKey)}`,
    );
    return data.posts;
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
  async addMonth({ aboutMonth, body, rank, hobong, author }) {
    const data = await call<{ post: Memory }>("", {
      method: "POST",
      body: JSON.stringify({
        kind: "record",
        aboutMonth,
        body,
        rank,
        hobong,
        ...author,
      }),
    });
    return data.post;
  },
  async listLetters({ rank, hobong }) {
    const q = new URLSearchParams({
      kind: "letter",
      rank,
      hobong: `${hobong}`,
    });
    const data = await call<{ posts: Memory[] }>(`?${q}`);
    return data.posts;
  },
  async listMyLetters() {
    const data = await call<{ posts: Memory[] }>("?kind=letter&mine=1");
    return data.posts;
  },
  async addLetter({ rank, hobong, body, author }) {
    const data = await call<{ post: Memory }>("", {
      method: "POST",
      body: JSON.stringify({ kind: "letter", rank, hobong, body, ...author }),
    });
    return data.post;
  },
  async remove(id) {
    await call(`/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
  toggleLike(id) {
    return call(`/${encodeURIComponent(id)}/like`, { method: "POST" });
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
