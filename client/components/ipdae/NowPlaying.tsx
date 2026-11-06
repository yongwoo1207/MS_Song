import { X } from "lucide-react";
import { toast } from "sonner";
import type { Player } from "@/hooks/usePlayer";
import YouTubeFrame from "./YouTubeFrame";
import { NextIcon, PauseIcon, PlayIcon, PrevIcon } from "./icons";

/**
 * Player pinned to the top of the 입대곡 tab. The video stays on screen the
 * whole time it plays (YouTube's embed policy forbids hidden, audio-only
 * playback); leaving the tab unmounts it, which stops the sound.
 */
export default function NowPlaying({ player }: { player: Player }) {
  const { current: song, queue } = player;
  if (!song || !queue) return null;

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
        onEnded={() => (player.hasNext ? player.next() : player.setPlaying(false))}
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
          {player.playing ? <PauseIcon className="size-[18px]" /> : <PlayIcon className="size-[18px]" />}
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
    </section>
  );
}
