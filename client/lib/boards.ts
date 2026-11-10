/**
 * The 커뮤니티 board: one list of everything, narrowed by topic chips.
 * To add a board later, add its topic to FEED_TOPICS (shared/posts.ts) and
 * an entry to TOPICS here.
 */
import type { FeedTopic } from "@shared/posts";

export interface BoardTopic {
  key: FeedTopic;
  /** Chip text */
  label: string;
  /** Address of the board narrowed to this topic */
  path: string;
  /** Line under the chips */
  note: string;
  /** Empty list */
  empty: string;
}

export const TOPICS: BoardTopic[] = [
  {
    key: "all",
    label: "전체",
    path: "/community",
    note: "글과 노래 댓글이 모두 최신순으로 보여요.",
    empty: "첫 번째 글을 남겨보세요.",
  },
  {
    key: "music",
    label: "음악",
    path: "/community/music",
    note: "노래에 남긴 댓글이에요. 노래를 누르면 들을 수 있어요.",
    empty: "차트에서 노래를 틀고 댓글을 남겨보세요.",
  },
];

/**
 * The topic a board address shows; "/community" and unknown ones
 * (including the old /community/story and /community/talk): all.
 */
export const topicOf = (pathname: string): BoardTopic =>
  TOPICS.find((t) => t.path === pathname.replace(/\/$/, "")) ?? TOPICS[0];
