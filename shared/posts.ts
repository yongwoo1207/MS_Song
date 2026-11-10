/**
 * Types shared by the browser and the Cloudflare Worker for user posts
 * (see migrations/):
 *   record = 노래 추억, a memory under a song
 *   post   = 커뮤니티 글, on no song
 *   talk   = 선후임 소통 글 between 현역 and 예비역
 *   reply  = 댓글 under a post or talk, or a 대댓글 under a 댓글
 */

export const POST_RANKS = ["이병", "일병", "상병", "병장"] as const;
export const POST_BRANCHES = [
  "육군",
  "해군",
  "공군",
  "해병대",
  "카투사",
  "공익",
] as const;
export const REPORT_REASONS = ["보안", "욕설·비방", "광고", "기타"] as const;

export const RECORD_MAX_LENGTH = 300;
export const TALK_MAX_LENGTH = 500;
export const REPLY_MAX_LENGTH = 300;
export const COMMUNITY_MAX_LENGTH = 500;
export const TITLE_MAX_LENGTH = 40;

/**
 * 커뮤니티 board topics and the post kinds each one lists. "all" is the one
 * board shown by default. A new board is one more entry here (and in
 * client/lib/boards.ts); if its posts need telling apart from existing
 * kinds, give posts a board column then.
 */
export const FEED_TOPICS = {
  all: ["post", "talk", "record"],
  story: ["post"],
  music: ["record"],
  talk: ["talk"],
} as const satisfies Record<string, readonly ApiPost["kind"][]>;
export type FeedTopic = keyof typeof FEED_TOPICS;

/** Who wrote it, as a feed filter. */
export const FEED_WHO = ["reserve", "serving", "pre"] as const;
export type FeedWho = (typeof FEED_WHO)[number];

export type PostRank = (typeof POST_RANKS)[number];
export type PostBranch = (typeof POST_BRANCHES)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];

export interface SongRef {
  key: string; // "artist|title"
  title: string;
  artist: string;
}

interface AuthorFields {
  cohortMonth: string; // 'YYYY-MM'
  branch: PostBranch;
  isReserve: boolean;
  /** 입대 예정자: days left to 입대 now. null once enlisted. */
  daysToEnlist?: number | null;
}

/** Body of POST /api/posts for a memory under a song. */
export interface NewSongRecord extends AuthorFields {
  kind: "record";
  song: SongRef;
  body: string;
  rank: PostRank; // rank whose chart the author found the song in
  aboutMonth: string; // 'YYYY-MM' chart month the memory files under
}

/** Body of POST /api/posts for a 커뮤니티 글: a free post, title and body. */
export interface NewCommunityPost extends AuthorFields {
  kind: "post";
  title: string;
  body: string;
  rank: PostRank | null; // the writer's rank now (null for 예비역)
}

/**
 * Body of POST /api/posts for a 선후임 소통 글: 현역 write to 예비역 선배,
 * 예비역 to 현역 후임, and anyone replies under it.
 */
export interface NewTalk extends AuthorFields {
  kind: "talk";
  title: string;
  body: string;
  rank: PostRank | null; // the writer's rank now (null for 예비역)
}

/** Body of POST /api/posts for a 댓글 under a post or talk. */
export interface NewReply extends AuthorFields {
  kind: "reply";
  parentId: string; // the thread
  /** 대댓글: the 댓글 it answers */
  replyTo?: string | null;
  body: string;
}

/** A post as the API returns it. The author is never exposed. */
export interface ApiPost {
  id: string;
  kind: "record" | "post" | "talk" | "reply";
  /** 커뮤니티 글 only; older ones have none. */
  title: string | null;
  body: string;
  song: SongRef | null;
  rank: PostRank | null;
  aboutMonth: string | null; // 'YYYY-MM'
  cohortMonth: string;
  branch: PostBranch;
  isReserve: boolean;
  /** Written by a 입대 예정자 this many days before 입대 */
  daysToEnlist: number | null;
  likes: number;
  replies: number;
  createdAt: string; // ISO
  likedByMe: boolean;
  mine: boolean;
  /** Reply: the thread it is under. */
  parentId?: string | null;
  /** 대댓글: the top-level 댓글 it answers. */
  replyTo?: string | null;
  /** Reply written by whoever wrote the talk. */
  byAsker?: boolean;
  /** Hidden after reports. Only ever true in my own list. */
  hidden?: boolean;
}

/** GET /api/song-counts */
export interface ApiSongStats {
  counts: Record<string, number>; // memories per song key
  likes: Record<string, number>; // hearts per song key
  liked: string[]; // song keys I hearted
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
    title: string | null;
    body: string;
    songTitle: string | null;
    rank: PostRank | null;
    aboutMonth: string | null;
    parentId: string | null;
  };
}

export const DEVICE_HEADER = "X-Device-Token";
