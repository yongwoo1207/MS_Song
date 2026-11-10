/**
 * The 커뮤니티 board: one list of everything, narrowed by topic chips.
 * To add a board later, add its topic to FEED_TOPICS (shared/posts.ts) and
 * an entry to TOPICS here; if people write into it, add a WRITE_TOPICS
 * entry too.
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
  /** 말머리 the 글쓰기 box starts on from here */
  writes: WriteKind;
}

/** The kinds written from the board (음악 is written from the song screens). */
export type WriteKind = "post" | "talk";

export const TOPICS: BoardTopic[] = [
  {
    key: "all",
    label: "전체",
    path: "/community",
    note: "이야기, 노래 댓글, 선후임 소통이 모두 최신순으로 보여요.",
    empty: "첫 번째 이야기를 남겨보세요.",
    writes: "post",
  },
  {
    key: "story",
    label: "이야기",
    path: "/community/story",
    note: "자유롭게 쓴 글이에요. 누르면 댓글을 볼 수 있어요.",
    empty: "첫 번째 이야기를 남겨보세요.",
    writes: "post",
  },
  {
    key: "music",
    label: "음악",
    path: "/community/music",
    note: "노래에 남긴 댓글이에요. 노래를 누르면 들을 수 있어요.",
    empty: "차트에서 노래를 틀고 댓글을 남겨보세요.",
    writes: "post",
  },
  {
    key: "talk",
    label: "선후임 소통",
    path: "/community/talk",
    note: "현역, 예비역, 입대 예정자가 서로 묻고 답하는 글이에요.",
    empty: "선배나 후임에게 첫 이야기를 남겨보세요.",
    writes: "talk",
  },
];

/** The topic a board address shows; "/community" and unknown ones: all. */
export const topicOf = (pathname: string): BoardTopic =>
  TOPICS.find((t) => t.path === pathname.replace(/\/$/, "")) ?? TOPICS[0];

export const WRITE_TOPICS: { kind: WriteKind; label: string }[] = [
  { kind: "post", label: "이야기" },
  { kind: "talk", label: "선후임 소통" },
];

/** Topic label shown on a post in the mixed list. */
export const kindLabel = (kind: string) =>
  kind === "talk" ? "선후임 소통" : kind === "post" ? "이야기" : null;
