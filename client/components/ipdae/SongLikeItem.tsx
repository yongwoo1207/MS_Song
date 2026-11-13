import { Heart, MessageCircle, Play } from "lucide-react";
import { type Memory, songWhoParts, timeAgo } from "@/lib/memories";
import { cn } from "@/lib/utils";

/**
 * Someone hearted a song (kind songlike) on the 음악 board: who, which
 * song, when. Anyone can play it, heart the song themselves and leave a
 * 한마디 under it from here. Title, artist and who all wrap over two lines
 * rather than being cut off.
 */
export default function SongLikeItem({
  like: m,
  likes,
  liked,
  memories = 0,
  onPlay,
  onLike,
  onComment,
}: {
  like: Memory;
  /** How many people hearted the song itself */
  likes: number;
  /** I hearted it too */
  liked: boolean;
  /** 한마디 left under the song */
  memories?: number;
  onPlay?: () => void;
  onLike?: () => void;
  onComment?: () => void;
}) {
  return (
    <li className="flex flex-col gap-1.5 rounded-2xl border bg-card px-3.5 pb-2 pt-3">
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary"
        >
          <Heart className="size-4 fill-current" strokeWidth={2} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {m.song && (
            <>
              <span className="line-clamp-2 break-words text-[14.5px] font-bold leading-snug">
                {m.song.title}
              </span>
              <span className="line-clamp-1 break-words text-[12.5px] text-muted-foreground">
                {m.song.artist}
              </span>
            </>
          )}
        </div>
        {onPlay && m.song && (
          <button
            type="button"
            onClick={onPlay}
            aria-label={`${m.song.title} 듣기`}
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Play className="size-3.5 fill-current" strokeWidth={2.2} />
          </button>
        )}
      </div>

      <p className="flex flex-wrap items-center gap-x-1 text-[11px] leading-relaxed text-ink-icon">
        {songWhoParts(m).map((part, i) => (
          <span key={part}>
            {i > 0 && <span className="pr-1">·</span>}
            {part}
          </span>
        ))}
        {m.mine && <span className="font-bold">· 나</span>}
        <span>· {timeAgo(m.createdAt)} 좋아요</span>
      </p>

      <div className="flex items-center gap-1 border-t border-muted pt-1">
        <button
          type="button"
          onClick={onLike}
          disabled={!onLike}
          aria-pressed={liked}
          aria-label={`${m.song?.title ?? "이 노래"} 좋아요 ${likes}`}
          className={cn(
            "-ml-1.5 flex h-8 items-center gap-1 rounded-lg px-1.5 text-xs",
            liked ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Heart
            className={cn("size-3.5", liked && "fill-current")}
            strokeWidth={2}
            aria-hidden="true"
          />
          {likes}
        </button>
        {onComment && (
          <button
            type="button"
            onClick={onComment}
            aria-haspopup="dialog"
            className="flex h-8 items-center gap-1 rounded-lg px-1.5 text-xs text-muted-foreground"
          >
            <MessageCircle
              className="size-3.5"
              strokeWidth={2}
              aria-hidden="true"
            />
            한마디 {memories > 0 ? memories : ""}
          </button>
        )}
      </div>
    </li>
  );
}
