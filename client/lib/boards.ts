/**
 * The 커뮤니티 board: one list of everything, narrowed by topic chips.
 * To add a board later, add its topic to FEED_TOPICS (shared/posts.ts) and
 * an entry to TOPICS here.
 */
import { type FeedTopic, POPULAR_DAYS, POPULAR_MIN_LIKES } from "@shared/posts";

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
    key: "popular",
    label: "인기",
    path: "/community/popular",
    note: `최근 ${POPULAR_DAYS}일 동안 좋아요 ${POPULAR_MIN_LIKES}개 이상 받은 글이에요. 반응이 많은 순서예요.`,
    empty: "아직 인기 글이 없어요. 마음에 드는 글에 좋아요를 눌러보세요.",
  },
  {
    key: "music",
    label: "음악",
    path: "/community/music",
    note: "노래에 남긴 댓글과 좋아요예요. 노래를 누르면 들을 수 있어요.",
    empty: "차트에서 노래에 좋아요를 누르거나 댓글을 남겨보세요.",
  },
];

/**
 * The topic a board address shows; "/community" and unknown ones
 * (including the old /community/story and /community/talk): all.
 */
export const topicOf = (pathname: string): BoardTopic =>
  TOPICS.find((t) => t.path === pathname.replace(/\/$/, "")) ?? TOPICS[0];
