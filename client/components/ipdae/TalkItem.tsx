import { Link } from "react-router-dom";
import { ChevronRight, MessageCircle } from "lucide-react";
import { type Memory, authorLine, timeAgo } from "@/lib/memories";
import { cn } from "@/lib/utils";

/** A 커뮤니티 글 or 소통 글 in a list: who, title, the start of it, 댓글 count. */
export default function TalkItem({
  talk: m,
  search = "",
  compact,
  label,
}: {
  talk: Memory;
  /** Topic badge in a mixed list, e.g. "선후임 소통" */
  label?: string | null;
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
            {label && (
              <span className="shrink-0 rounded-md bg-accent px-1.5 py-[2px] font-bold text-primary">
                {label}
              </span>
            )}
            <span className="truncate">{authorLine(m)}</span>
            {m.mine && <span className="shrink-0 font-bold">· 내 글</span>}
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
          <span
            className={cn(
              "flex items-center gap-1 text-xs font-bold",
              m.replies > 0 ? "text-primary" : "text-ink-icon",
            )}
          >
            <MessageCircle
              className="size-3.5"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            {m.replies > 0 ? `댓글 ${m.replies}` : "아직 댓글이 없어요"}
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
