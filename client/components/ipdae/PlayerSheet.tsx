import { useEffect, useRef } from "react";
import type { Player } from "@/hooks/usePlayer";
import { youtubeWatch } from "@/lib/format";
import type { RankPeriod } from "@/lib/service";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import YouTubeFrame from "./YouTubeFrame";
import UpNext from "./UpNext";
import { NextIcon, PauseIcon, PlayIcon, PrevIcon } from "./icons";

interface PlayerSheetProps {
  player: Player;
  /** Service period of the rank whose chart is queued. */
  period: RankPeriod | undefined;
}

/**
 * Bottom sheet with the YouTube player. It stays mounted once a song is
 * picked and only slides off-screen when collapsed, so playback continues.
 */
export default function PlayerSheet({ player, period }: PlayerSheetProps) {
  const { current: song, queue, expanded, setExpanded } = player;
  const grabber = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (expanded) grabber.current?.focus();
  }, [expanded]);

  if (!song || !queue) return null;
  const hidden = !expanded;

  return (
    <>
      <div
        aria-hidden="true"
        onClick={() => setExpanded(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/45 transition-opacity duration-300",
          expanded ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal={expanded}
        aria-label="플레이어"
        aria-hidden={hidden}
        {...({ inert: hidden ? "" : undefined } as object)}
        onKeyDown={(e) => e.key === "Escape" && setExpanded(false)}
        className={cn(
          "fixed bottom-0 left-1/2 z-50 flex max-h-[92dvh] w-full max-w-[430px] -translate-x-1/2 flex-col gap-4 overflow-y-auto rounded-t-3xl bg-background px-4 pb-7 pt-2 transition-transform duration-300 ease-out",
          hidden && "translate-y-full",
        )}
      >
        <div className="flex justify-center py-1.5">
          <button
            ref={grabber}
            type="button"
            aria-label="플레이어 접기"
            onClick={() => setExpanded(false)}
            className="flex h-5 w-11 items-center justify-center"
          >
            <span className="h-[5px] w-10 rounded-full bg-input" />
          </button>
        </div>

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

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-accent px-1.5 py-[3px] text-[11px] font-bold text-primary">
              {queue.rank} {song.rank}위
            </span>
            {period && (
              <span className="font-mono text-xs text-muted-foreground">
                {format(period.start, "yy.MM")} – {format(period.end, "yy.MM")}
              </span>
            )}
          </div>
          <span className="text-[22px] font-bold tracking-[-0.01em]">{song.title}</span>
          <span className="text-[15px] text-muted-foreground">{song.artist}</span>
        </div>

        <div className="flex items-center justify-center gap-7">
          <button
            type="button"
            aria-label="이전 곡"
            disabled={!player.hasPrev}
            onClick={player.prev}
            className="flex size-12 items-center justify-center text-foreground disabled:opacity-30"
          >
            <PrevIcon className="size-[26px]" />
          </button>
          <button
            type="button"
            aria-label={player.playing ? "일시정지" : "재생"}
            onClick={() => player.setPlaying(!player.playing)}
            className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            {player.playing ? <PauseIcon className="size-6" /> : <PlayIcon className="size-6" />}
          </button>
          <button
            type="button"
            aria-label="다음 곡"
            disabled={!player.hasNext}
            onClick={player.next}
            className="flex size-12 items-center justify-center text-foreground disabled:opacity-30"
          >
            <NextIcon className="size-[26px]" />
          </button>
        </div>

        <a
          href={youtubeWatch(song.youtubeId ?? "")}
          target="_blank"
          rel="noreferrer"
          onClick={() => player.setPlaying(false)}
          className="flex h-11 shrink-0 items-center justify-center rounded-xl border border-input bg-card text-sm font-bold text-foreground"
        >
          화면 끄고 들으려면 · 유튜브 앱에서 이어 듣기
        </a>

        <UpNext player={player} />
      </div>
    </>
  );
}
