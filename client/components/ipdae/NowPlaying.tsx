import { useEffect, useState } from "react";
import { ChevronRight, Heart, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import { songKey } from "@shared/api";
import type { Player } from "@/hooks/usePlayer";
import type { PostRank } from "@shared/posts";
import { type MemoryAuthor, monthParam } from "@/lib/memories";
import {
  useSongCounts,
  useSongLikes,
  useToggleSongLike,
} from "@/hooks/useMyPosts";
import { cn } from "@/lib/utils";
import MemoriesPanel from "./MemoriesPanel";
import YouTubeFrame from "./YouTubeFrame";
import { NextIcon, PauseIcon, PlayIcon, PrevIcon } from "./icons";

/**
 * Player pinned to the top of the 입대곡 tab. The video stays on screen the
 * whole time it plays (YouTube's embed policy forbids hidden, audio-only
 * playback); leaving the tab unmounts it, which stops the sound.
 */
export default function NowPlaying({
  player,
  author,
  asRank,
}: {
  player: Player;
  author: MemoryAuthor;
  /**
   * The rank a heart or 한마디 from here is recorded with. Left out on my
   * own 입대곡, where the chart's rank is my rank of that time; on someone
   * else's chart it is my rank now (null when I hold none).
   */
  asRank?: PostRank | null;
}) {
  const { current: song, queue } = player;
  // undefined: this chart is mine, so its rank is the one to record
  const rank = asRank === undefined ? (queue?.rank ?? null) : asRank;
  const key = song ? songKey(song) : undefined;
  // Total under the song (the panel itself loads 20 at a time)
  const counts = useSongCounts();
  const total = key ? (counts?.[key] ?? 0) : 0;
  const { likes, liked } = useSongLikes();
  const toggleLike = useToggleSongLike();
  const hearted = !!key && liked.has(key);
  const hearts = key ? (likes[key] ?? 0) : 0;
  const [memoriesOpen, setMemoriesOpen] = useState(false);
  // Tapping a song in the chart opens its memories under the video.
  useEffect(() => {
    if (player.memoriesRequest > 0) setMemoriesOpen(true);
  }, [player.memoriesRequest]);
  useEffect(() => {
    if (!key) setMemoriesOpen(false); // player closed
  }, [key]);
  if (!song || !queue || !key) return null;

  return (
    <section
      aria-label="지금 재생 중"
      className="sticky top-0 z-20 flex flex-col border-b bg-background"
    >
      <YouTubeFrame
        videoId={song.youtubeId ?? ""}
        title={`${song.title} - ${song.artist}`}
        playing={player.playing}
        onPlayingChange={player.setPlaying}
        onEnded={() =>
          player.hasNext ? player.next() : player.setPlaying(false)
        }
        onError={() => {
          toast(`'${song.title}' 영상을 재생할 수 없어요`, {
            description: player.hasNext ? "다음 곡으로 넘어갈게요." : undefined,
          });
          if (player.hasNext) player.next();
          else player.setPlaying(false);
        }}
      />
      <div className="flex items-center gap-1 py-2 pl-4 pr-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] font-bold">{song.title}</span>
          <span className="truncate text-xs text-muted-foreground">
            {song.artist} · {queue.rank} {song.rank}위
          </span>
        </div>
        <button
          type="button"
          aria-label="이전 곡"
          disabled={!player.hasPrev}
          onClick={player.prev}
          className="flex size-10 shrink-0 items-center justify-center text-foreground disabled:opacity-30"
        >
          <PrevIcon className="size-5" />
        </button>
        <button
          type="button"
          aria-label={player.playing ? "일시정지" : "재생"}
          onClick={() => player.setPlaying(!player.playing)}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
        >
          {player.playing ? (
            <PauseIcon className="size-[18px]" />
          ) : (
            <PlayIcon className="size-[18px]" />
          )}
        </button>
        <button
          type="button"
          aria-label="다음 곡"
          disabled={!player.hasNext}
          onClick={player.next}
          className="flex size-10 shrink-0 items-center justify-center text-foreground disabled:opacity-30"
        >
          <NextIcon className="size-5" />
        </button>
        <button
          type="button"
          aria-label="플레이어 닫기"
          onClick={player.stop}
          className="flex size-10 shrink-0 items-center justify-center text-muted-foreground"
        >
          <X className="size-5" strokeWidth={2} />
        </button>
      </div>
      <div className="flex h-10 items-stretch border-t border-muted">
        <button
          type="button"
          onClick={() =>
            toggleLike.mutate(
              {
                key: key!,
                title: song!.title,
                artist: song!.artist,
                rank,
                author,
              },
              { onError: (err) => toast(err.message) },
            )
          }
          aria-pressed={hearted}
          aria-label={`이 노래 좋아요 ${hearts}`}
          className={cn(
            "flex shrink-0 items-center gap-1 border-r border-muted pl-4 pr-3 text-[13px] font-bold",
            hearted ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Heart
            className={cn("size-4", hearted && "fill-current")}
            strokeWidth={2}
            aria-hidden="true"
          />
          <span className="font-mono text-xs">{hearts}</span>
        </button>
        <button
          type="button"
          onClick={() => setMemoriesOpen(true)}
          aria-haspopup="dialog"
          className="flex min-w-0 flex-1 items-center gap-1.5 pl-3 pr-4 text-left text-[13px]"
        >
          <MessageCircle
            className="size-4 text-primary"
            strokeWidth={2}
            aria-hidden="true"
          />
          <span className="font-bold">이 노래의 추억</span>
          <span className="font-mono text-xs text-ink-icon">{total}</span>
          <span className="flex-1" />
          <span className="text-xs font-bold text-primary">나도 남기기</span>
          <ChevronRight
            className="size-4 text-primary"
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
      </div>
      {memoriesOpen && (
        <MemoriesPanel
          song={{ key, title: song.title, artist: song.artist }}
          rank={rank}
          aboutMonth={monthParam(song.bestMonth)}
          author={author}
          onClose={() => setMemoriesOpen(false)}
        />
      )}
    </section>
  );
}
