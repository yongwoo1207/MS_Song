import type { RankedChartSong } from "@shared/api";
import { cn } from "@/lib/utils";
import { PlayIcon } from "./icons";

interface SongRowProps {
  song: RankedChartSong;
  active: boolean;
  /** Missing when no video is matched yet; the row is then not playable. */
  onPlay?: () => void;
}

export default function SongRow({ song, active, onPlay }: SongRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onPlay}
        disabled={!onPlay}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex h-14 w-full items-center gap-3 rounded-xl px-2 text-left transition-colors",
          "hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:hover:bg-transparent",
          active && "bg-accent hover:bg-accent",
        )}
      >
        <span
          className={cn(
            "w-6 shrink-0 text-center font-mono text-[15px] font-semibold",
            active ? "text-primary" : "text-foreground",
          )}
        >
          {song.rank}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] font-bold">{song.title}</span>
          <span className="truncate text-[13px] text-muted-foreground">{song.artist}</span>
        </span>
        {song.rank === 1 && (
          <span className="whitespace-nowrap rounded-md bg-accent px-1.5 py-[3px] text-[11px] font-bold text-primary">
            이 시기 1위
          </span>
        )}
        {onPlay ? (
          <span
            aria-hidden="true"
            className={cn(
              "flex size-8 shrink-0 items-center justify-center",
              active ? "text-primary" : "text-ink-icon",
            )}
          >
            <PlayIcon className="size-[18px]" />
          </span>
        ) : (
          <span className="shrink-0 whitespace-nowrap text-[11px] text-muted-foreground">
            영상 준비 중
          </span>
        )}
      </button>
    </li>
  );
}
