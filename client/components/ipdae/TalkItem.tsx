import { Link } from "react-router-dom";
import { ChevronRight, MessageCircle } from "lucide-react";
import { type Memory, cohortLabel, timeAgo } from "@/lib/memories";
import { cn } from "@/lib/utils";

/** "2023년 5월 군번 · 육군 · 일병", "… · 예비역" */
export function authorLine(m: Memory) {
  const role = m.isReserve ? "예비역" : (m.rank ?? "현역");
  return `${cohortLabel(m.cohortMonth)} · ${m.branch} · ${role}`;
}

/** A 소통 글 in a list: who wrote it, the start of it, how many replied. */
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
            <span className="flex-1" />
            <span className="shrink-0">{timeAgo(m.createdAt)}</span>
          </span>
          <span className="line-clamp-2 whitespace-pre-wrap break-words text-[13.5px] leading-relaxed">
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
            {m.replies > 0 ? `답글 ${m.replies}` : "아직 답글이 없어요"}
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
