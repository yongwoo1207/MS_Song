import { Heart, Music } from "lucide-react";
import { type Memory, cohortLabel, timeAgo } from "@/lib/memories";
import { cn } from "@/lib/utils";

/**
 * One record card: who (군번 · 계급), when, body, like and delete.
 * `showSong` adds the song it hangs on (the 커뮤니티 feed mixes songs).
 */
export default function MemoryItem({
  memory: m,
  showSong,
  onLike,
  onDelete,
}: {
  memory: Memory;
  showSong?: boolean;
  onLike: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex flex-col gap-1.5 rounded-2xl border bg-card px-3.5 pb-2 pt-3">
      {showSong && m.song && (
        <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
          <Music
            className="size-3.5 shrink-0 text-primary"
            strokeWidth={2.2}
            aria-hidden="true"
          />
          <span className="truncate font-bold">{m.song.title}</span>
          <span className="shrink-0 text-muted-foreground">·</span>
          <span className="truncate text-muted-foreground">
            {m.song.artist}
          </span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <span className="whitespace-nowrap rounded-md bg-accent px-1.5 py-[3px] text-[11px] font-bold text-primary">
          {cohortLabel(m.cohortMonth)} · {m.rank} 시절
          {m.isReserve ? " · 예비역" : ""}
        </span>
        {m.mine && (
          <span className="text-[11px] font-bold text-ink-icon">내 글</span>
        )}
        <span className="flex-1" />
        <span className="text-[11px] text-ink-icon">
          {timeAgo(m.createdAt)}
        </span>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
        {m.body}
      </p>
      <div className="flex items-center gap-1 border-t border-muted pt-1">
        <button
          type="button"
          onClick={onLike}
          aria-pressed={m.likedByMe}
          aria-label={`공감 ${m.likes}`}
          className={cn(
            "flex h-8 items-center gap-1 rounded-lg px-1.5 text-xs",
            m.likedByMe ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Heart
            className={cn("size-3.5", m.likedByMe && "fill-current")}
            strokeWidth={2}
            aria-hidden="true"
          />
          {m.likes}
        </button>
        <span className="flex-1" />
        {m.mine && (
          <button
            type="button"
            onClick={onDelete}
            className="h-8 rounded-lg px-1.5 text-xs text-muted-foreground hover:text-destructive"
          >
            삭제
          </button>
        )}
      </div>
    </li>
  );
}
