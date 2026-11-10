import { useCallback, useState } from "react";
import type { RankedChartSong } from "@shared/api";
import type { Rank } from "@/lib/service";

export interface PlayerQueue {
  /** The listener's rank for these songs ("일병 시절") */
  rank: Rank;
  songs: RankedChartSong[];
}

/** Queue + transport state for the in-page YouTube player. */
export function usePlayer() {
  const [queue, setQueue] = useState<PlayerQueue | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  /** Bumped when a song is picked by hand, so the player opens its memories. */
  const [memoriesRequest, setMemoriesRequest] = useState(0);

  const current = queue?.songs[index] ?? null;
  const hasPrev = index > 0;
  const hasNext = !!queue && index < queue.songs.length - 1;

  const play = useCallback(
    (q: PlayerQueue, i = 0, opts: { openMemories?: boolean } = {}) => {
      setQueue(q);
      setIndex(i);
      setPlaying(true);
      if (opts.openMemories) setMemoriesRequest((n) => n + 1);
    },
    [],
  );

  const stop = useCallback(() => {
    setQueue(null);
    setIndex(0);
    setPlaying(false);
  }, []);

  const jump = useCallback(
    (i: number) => {
      if (!queue || i < 0 || i >= queue.songs.length) return;
      setIndex(i);
      setPlaying(true);
    },
    [queue],
  );

  return {
    queue,
    index,
    current,
    playing,
    setPlaying,
    memoriesRequest,
    hasPrev,
    hasNext,
    play,
    stop,
    jump,
    prev: () => jump(index - 1),
    next: () => jump(index + 1),
  };
}

export type Player = ReturnType<typeof usePlayer>;
