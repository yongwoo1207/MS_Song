/**
 * Notifications: likes on my posts and replies to my 소통 글, per post.
 * Served by the Worker's /api/notifications.
 */
import type { ApiNotification } from "@shared/posts";
import { apiCall } from "./memories";

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

/** "'LOVE DIVE'에 남긴 추억", "내 소통 글" … */
function target(post: Notification["post"]): string {
  if (post.songTitle) return `'${post.songTitle}'에 남긴 추억`;
  if (post.kind === "post")
    return post.title ? `'${post.title}'` : "내 커뮤니티 글";
  if (post.kind === "talk")
    return post.title ? `'${post.title}'` : "내 소통 글";
  if (post.kind === "reply") return "내 댓글";
  return "내 글";
}

/** "'LOVE DIVE'에 남긴 추억에 공감 3개가 달렸어요" */
export function notificationText(n: Notification): string {
  return n.type === "like"
    ? `${target(n.post)}에 공감 ${n.count}개가 달렸어요`
    : `${target(n.post)}에 ${n.count}명이 댓글을 달았어요`;
}

/** Where tapping a notification goes. */
export function notificationHref(n: Notification): string {
  if (n.post.kind === "talk" || n.post.kind === "post")
    return `/talk/${n.postId}`;
  if (n.post.kind === "reply" && n.post.parentId)
    return `/talk/${n.post.parentId}`;
  return "/me";
}
