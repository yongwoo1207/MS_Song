import { useEffect, useState } from "react";
import { ChevronRight, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import { songKey } from "@shared/api";
import type { Player } from "@/hooks/usePlayer";
import { type MemoryAuthor, monthParam } from "@/lib/memories";
import { useMemories } from "@/hooks/useMemories";
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
}: {
  player: Player;
  author: MemoryAuthor;
}) {
  const { current: song, queue } = player;
  const key = song ? songKey(song) : undefined;
  const { memories } = useMemories(key);
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
      <button
        type="button"
        onClick={() => setMemoriesOpen(true)}
        aria-haspopup="dialog"
        className="flex h-10 items-center gap-1.5 border-t border-muted px-4 text-left text-[13px]"
      >
        <MessageCircle
          className="size-4 text-primary"
          strokeWidth={2}
          aria-hidden="true"
        />
        <span className="font-bold">이 노래의 추억</span>
        <span className="font-mono text-xs text-ink-icon">
          {memories.length}
        </span>
        <span className="flex-1" />
        <span className="text-xs font-bold text-primary">나도 남기기</span>
        <ChevronRight
          className="size-4 text-primary"
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>
      {memoriesOpen && (
        <MemoriesPanel
          song={{ key, title: song.title, artist: song.artist }}
          rank={queue.rank}
          aboutMonth={queue.month ?? monthParam(song.bestMonth)}
          author={author}
          onClose={() => setMemoriesOpen(false)}
        />
      )}
    </section>
  );
}
