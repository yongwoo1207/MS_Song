/**
 * Notifications: likes on my posts (replies later), grouped per post.
 * Served by the Worker's /api/notifications.
 */
import type { ApiNotification } from "@shared/posts";
import { apiCall, monthLabel } from "./memories";

export type Notification = ApiNotification;

export const notificationApi = {
  async unread(): Promise<number> {
    const data = await apiCall<{ unread: number }>(
      "/api/notifications?count=1",
    );
    return data.unread;
  },
  list() {
    return apiCall<{ unread: number; notifications: Notification[] }>(
      "/api/notifications",
    );
  },
  markRead() {
    return apiCall<void>("/api/notifications/read", { method: "POST" });
  },
};

/** "'LOVE DIVE'에 남긴 추억", "상병 2호봉에 남긴 한마디" … */
function target(post: Notification["post"]): string {
  if (post.songTitle) return `'${post.songTitle}'에 남긴 추억`;
  if (post.kind === "letter")
    return `${post.rank} ${post.hobong}호봉에 남긴 한마디`;
  if (post.aboutMonth) return `${monthLabel(post.aboutMonth)} 타임라인 기록`;
  return "내 글";
}

/** "'LOVE DIVE'에 남긴 추억에 공감 3개가 달렸어요" */
export function notificationText(n: Notification): string {
  return n.type === "like"
    ? `${target(n.post)}에 공감 ${n.count}개가 달렸어요`
    : `${target(n.post)}에 댓글 ${n.count}개가 달렸어요`;
}
