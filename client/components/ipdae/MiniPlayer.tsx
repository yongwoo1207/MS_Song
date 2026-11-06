import { ChevronUp } from "lucide-react";
import type { Player } from "@/hooks/usePlayer";
import { PauseIcon, PlayIcon } from "./icons";

/** Floating now-playing bar above the result list. */
export default function MiniPlayer({ player }: { player: Player }) {
  const song = player.current;
  if (!song) return null;
  return (
    // sits just above the bottom tab bar (76px + safe area)
    <div className="fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-30 mx-auto w-full max-w-[430px] px-2">
      <div className="flex h-16 items-center gap-3 rounded-2xl bg-foreground pl-4 pr-2 text-white shadow-lg">
        <button
          type="button"
          onClick={() => player.setExpanded(true)}
          className="flex min-w-0 flex-1 flex-col gap-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <span className="w-full truncate text-sm font-bold">{song.title}</span>
          <span className="w-full truncate text-xs text-ink-soft">
            {song.artist} · 탭하면 플레이어 열기
          </span>
        </button>
        <button
          type="button"
          aria-label={player.playing ? "일시정지" : "재생"}
          onClick={() => player.setPlaying(!player.playing)}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-foreground"
        >
          {player.playing ? (
            <PauseIcon className="size-[18px]" />
          ) : (
            <PlayIcon className="size-[18px]" />
          )}
        </button>
        <button
          type="button"
          aria-label="플레이어 펼치기"
          onClick={() => player.setExpanded(true)}
          className="flex size-11 shrink-0 items-center justify-center text-white"
        >
          <ChevronUp className="size-5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
