import { Heart, MessageCircle } from "lucide-react";
import type { RankedChartSong } from "@shared/api";
import { cn } from "@/lib/utils";
import { PlayIcon } from "./icons";

interface SongRowProps {
  song: RankedChartSong;
  active: boolean;
  /** How many memories people left under the song */
  memories?: number;
  /** How many people hearted the song */
  likes?: number;
  /** I hearted it */
  liked?: boolean;
  onLike?: () => void;
  /** Missing when no video is matched yet; the row is then not playable. */
  onPlay?: () => void;
}

/** '2025-3' → '25년 03월' */
const monthLabel = (key: string) => {
  const [y, m] = key.split("-");
  return `${y.slice(2)}년 ${m.padStart(2, "0")}월`;
};

export default function SongRow({
  song,
  active,
  memories = 0,
  likes = 0,
  liked = false,
  onLike,
  onPlay,
}: SongRowProps) {
  return (
    <li
      className={cn(
        "flex items-center rounded-xl transition-colors",
        active && "bg-accent",
      )}
    >
      <button
        type="button"
        onClick={onPlay}
        disabled={!onPlay}
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex h-14 min-w-0 flex-1 items-center gap-3 rounded-xl pl-2 pr-1 text-left transition-colors",
          "hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:hover:bg-transparent",
          active && "hover:bg-accent",
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
          <span className="truncate text-[13px] text-muted-foreground">
            {song.artist}
          </span>
        </span>
        {memories > 0 && (
          <span
            className="flex shrink-0 items-center gap-0.5 text-[11.5px] font-bold text-primary"
            aria-label={`추억 ${memories}개`}
          >
            <MessageCircle
              className="size-3.5"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            {memories}
          </span>
        )}
        {song.numberOneMonths.length > 0 && (
          <span
            className="flex shrink-0 items-center gap-1"
            title={
              song.numberOneMonths.map(monthLabel).join(", ") + " 월간 1위"
            }
          >
            <span className="whitespace-nowrap rounded-md bg-accent px-1.5 py-[3px] text-[11px] font-bold text-primary">
              {monthLabel(song.numberOneMonths[0])} 1위
            </span>
            {song.numberOneMonths.length > 1 && (
              <span className="whitespace-nowrap text-[11px] font-bold text-primary">
                +{song.numberOneMonths.length - 1}
              </span>
            )}
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
      {onLike && (
        <button
          type="button"
          onClick={onLike}
          aria-pressed={liked}
          aria-label={`${song.title} 좋아요 ${likes}`}
          className={cn(
            "flex h-14 w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl",
            liked ? "text-primary" : "text-ink-icon hover:text-foreground",
          )}
        >
          <Heart
            className={cn("size-[18px]", liked && "fill-current")}
            strokeWidth={2}
            aria-hidden="true"
          />
          <span className="font-mono text-[10.5px] font-bold leading-none">
            {likes}
          </span>
        </button>
      )}
    </li>
  );
}
