/**
 * Types shared by the browser and the Cloudflare Worker for user posts
 * (see migrations/). A record hangs on a song, or only on a timeline month.
 */

export const POST_RANKS = ["이병", "일병", "상병", "병장"] as const;
export const POST_BRANCHES = ["육군", "해군", "공군", "해병대"] as const;
export const REPORT_REASONS = ["보안", "욕설·비방", "광고", "기타"] as const;

export const RECORD_MAX_LENGTH = 300;
export const LETTER_MAX_LENGTH = 200;
/** 한마디 one person may leave at the same 계급·호봉 */
export const LETTERS_PER_SLOT = 3;

export type PostRank = (typeof POST_RANKS)[number];
export type PostBranch = (typeof POST_BRANCHES)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface SongRef {
  key: string; // "artist|title"
  title: string;
  artist: string;
}

/** A major issue (사건) of a month, operator-curated (db/events.sql). */
export interface ApiEvent {
  id: string; // slug, e.g. 'covid-leave-ban'
  title: string;
  month: string; // 'YYYY-MM'
  date: string | null; // 'YYYY-MM-DD' when the day is known
  summary: string; // facts only
  scope: string; // '전 군종', '육군' …
  sourceUrl: string | null;
}

/** Body of POST /api/posts for a memory under a song. */
export interface NewSongRecord {
  kind: "record";
  song: SongRef;
  body: string;
  rank: PostRank; // rank whose chart the author found the song in
  aboutMonth: string; // 'YYYY-MM' chart month the memory files under
  cohortMonth: string; // 'YYYY-MM'
  branch: PostBranch;
  isReserve: boolean;
}

/** Body of POST /api/posts for a record written to a timeline month. */
export interface NewMonthRecord {
  kind: "record";
  aboutMonth: string; // 'YYYY-MM'
  body: string;
  rank: PostRank; // the author's rank that month
  hobong?: number; // and 호봉
  cohortMonth: string;
  branch: PostBranch;
  isReserve: boolean;
}

/**
 * Body of POST /api/posts for a 한마디: shown to whoever is at the same
 * 계급·호봉 later. 현역 write at their current 호봉, 예비역 pick one.
 */
export interface NewLetter {
  kind: "letter";
  body: string;
  rank: PostRank;
  hobong: number;
  cohortMonth: string;
  branch: PostBranch;
  isReserve: boolean;
}

/** A post as the API returns it. The author is never exposed. */
export interface ApiPost {
  id: string;
  kind: "record" | "letter" | "talk" | "reply";
  body: string;
  song: SongRef | null;
  rank: PostRank | null;
  hobong: number | null;
  aboutMonth: string | null; // 'YYYY-MM'
  cohortMonth: string;
  branch: PostBranch;
  isReserve: boolean;
  likes: number;
  replies: number;
  createdAt: string; // ISO
  likedByMe: boolean;
  mine: boolean;
  /** Hidden after reports. Only ever true in my own list. */
  hidden?: boolean;
}

/** Activity on one of my posts, as GET /api/notifications returns it. */
export interface ApiNotification {
  type: "like" | "reply";
  postId: string;
  count: number; // how many people
  unread: number; // of which not seen yet
  lastAt: string; // ISO, the latest one
  post: {
    kind: ApiPost["kind"];
    body: string;
    songTitle: string | null;
    rank: PostRank | null;
    hobong: number | null;
    aboutMonth: string | null;
  };
}

export const DEVICE_HEADER = "X-Device-Token";
