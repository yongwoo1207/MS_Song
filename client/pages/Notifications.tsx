import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle } from "lucide-react";
import MobileShell from "@/components/ipdae/MobileShell";
import SubHeader from "@/components/ipdae/SubHeader";
import { useNotifications } from "@/hooks/useNotifications";
import { timeAgo } from "@/lib/memories";
import { notificationHref, notificationText } from "@/lib/notifications";
import { cn } from "@/lib/utils";

/**
 * 알림: likes on my posts and replies to my 소통 글, one line per post.
 * Opening it marks all read.
 */
export default function Notifications() {
  const { notifications, unread, isLoading, isError, refetch, markRead } =
    useNotifications();
  const { mutate } = markRead;

  useEffect(() => {
    if (unread > 0) mutate();
  }, [unread, mutate]);

  return (
    <MobileShell>
      <SubHeader title="알림" />
      <main className="flex flex-1 flex-col px-4 pb-6">
        {isLoading ? (
          <p className="py-8 text-center text-[13px] text-muted-foreground">
            불러오는 중…
          </p>
        ) : isError ? (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3.5 py-2.5 text-[13px] text-muted-foreground">
            알림을 불러오지 못했어요.
            <button
              type="button"
              onClick={() => refetch()}
              className="h-8 rounded-lg border bg-card px-3 text-xs font-bold text-primary"
            >
              다시 시도
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <p className="rounded-xl bg-muted px-4 py-6 text-center text-[13px] leading-relaxed text-muted-foreground">
            아직 알림이 없어요. 내 글에 공감이나 답글이 달리면 여기로
            알려드려요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notifications.map((n) => {
              const fresh = n.unread > 0;
              const Icon = n.type === "like" ? Heart : MessageCircle;
              return (
                <li key={`${n.type}-${n.postId}`}>
                  <Link
                    to={notificationHref(n)}
                    className={cn(
                      "flex gap-3 rounded-2xl border px-3.5 py-3",
                      fresh ? "border-primary/40 bg-accent/60" : "bg-card",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary"
                    >
                      <Icon className="size-4 fill-current" strokeWidth={2} />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[13.5px] font-bold leading-snug">
                        {fresh && <span className="sr-only">새 알림, </span>}
                        {notificationText(n)}
                      </span>
                      <span className="line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
                        {n.post.body}
                      </span>
                      <span className="text-[11px] text-ink-icon">
                        {timeAgo(n.lastAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </MobileShell>
  );
}
