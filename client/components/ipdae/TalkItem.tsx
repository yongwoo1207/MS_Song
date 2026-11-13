import { Link } from "react-router-dom";
import { ChevronRight, Heart, MessageCircle } from "lucide-react";
import { type Memory, authorLine, isPopular, timeAgo } from "@/lib/memories";
import PopularBadge from "./PopularBadge";
import { cn } from "@/lib/utils";

/** A 커뮤니티 글 in a list: who, title, the start of it, 댓글 count. */
export default function TalkItem({
  talk: m,
  search = "",
  compact,
}: {
  talk: Memory;
  /** ?d=…&b=… to carry over */
  search?: string;
  /** Inside a home card: no border box */
  compact?: boolean;
}) {
  return (
    <li>
      <Link
        to={`/talk/${m.id}${search}`}
        className={cn(
          "flex items-center gap-2",
          compact
            ? "border-t border-muted py-2.5"
            : "rounded-2xl border bg-card px-3.5 py-3",
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-1.5 text-[11px] text-ink-icon">
            <span className="truncate">{authorLine(m)}</span>
            {m.mine && <span className="shrink-0 font-bold">· 내 글</span>}
            {isPopular(m) && <PopularBadge />}
            <span className="flex-1" />
            <span className="shrink-0">{timeAgo(m.createdAt)}</span>
          </span>
          {m.title && (
            <span className="line-clamp-1 break-words text-[14.5px] font-bold leading-snug">
              {m.title}
            </span>
          )}
          <span
            className={cn(
              "whitespace-pre-wrap break-words text-[13.5px] leading-relaxed",
              m.title ? "line-clamp-1 text-muted-foreground" : "line-clamp-2",
            )}
          >
            {m.body}
          </span>
          <span className="flex items-center gap-3 text-xs font-bold text-ink-icon">
            <span
              className={cn(
                "flex items-center gap-1",
                m.likes > 0 && "text-primary",
              )}
            >
              <Heart
                className={cn("size-3.5", m.likedByMe && "fill-current")}
                strokeWidth={2.2}
                aria-hidden="true"
              />
              좋아요 {m.likes}
            </span>
            <span
              className={cn(
                "flex items-center gap-1",
                m.replies > 0 && "text-primary",
              )}
            >
              <MessageCircle
                className="size-3.5"
                strokeWidth={2.2}
                aria-hidden="true"
              />
              댓글 {m.replies}
            </span>
          </span>
        </span>
        <ChevronRight
          className="size-4 shrink-0 text-ink-icon"
          strokeWidth={2}
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}
