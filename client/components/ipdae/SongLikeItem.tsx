import { Heart, Play } from "lucide-react";
import {
  type Memory,
  cohortLabel,
  preEnlistLabel,
  timeAgo,
} from "@/lib/memories";

/**
 * Someone hearted a song (kind songlike) on the 음악 board: who, which
 * song, when. Tapping the song plays it.
 */
export default function SongLikeItem({
  like: m,
  onPlay,
}: {
  like: Memory;
  onPlay?: () => void;
}) {
  const who =
    m.daysToEnlist != null
      ? preEnlistLabel(m.daysToEnlist)
      : `${cohortLabel(m.cohortMonth)}${m.rank ? ` · ${m.rank} 시절` : ""}${m.isReserve ? " · 예비역" : ""}`;
  return (
    <li className="flex items-center gap-2.5 rounded-2xl border bg-card px-3.5 py-2.5">
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary"
      >
        <Heart className="size-4 fill-current" strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-[11px] text-ink-icon">
          <span className="truncate">{who}</span>
          {m.mine && <span className="shrink-0 font-bold">· 나</span>}
          <span className="flex-1" />
          <span className="shrink-0">{timeAgo(m.createdAt)}</span>
        </span>
        {m.song && (
          <span className="flex min-w-0 items-baseline gap-1 text-[13.5px]">
            <span className="truncate font-bold">{m.song.title}</span>
            <span className="shrink-0 text-muted-foreground">·</span>
            <span className="truncate text-muted-foreground">
              {m.song.artist}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              에 좋아요
            </span>
          </span>
        )}
      </span>
      {m.song && onPlay && (
        <button
          type="button"
          onClick={onPlay}
          aria-label={`${m.song.title} 듣기`}
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          <Play className="size-3.5 fill-current" strokeWidth={2.2} />
        </button>
      )}
    </li>
  );
}
