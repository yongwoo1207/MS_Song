import type { Player } from "@/hooks/usePlayer";
import { songKey } from "@shared/api";

/** The next two songs in the queue, tappable to skip ahead. */
export default function UpNext({ player }: { player: Player }) {
  const { queue, index } = player;
  if (!queue) return null;
  const upNext = queue.songs.slice(index + 1, index + 3);
  if (upNext.length === 0) return null;

  return (
    <div className="flex flex-col gap-0.5 border-t pt-3">
      <span className="px-1 pb-1.5 text-[13px] font-bold text-muted-foreground">
        다음 곡 · {queue.rank} TOP
      </span>
      <ol>
        {upNext.map((s, i) => (
          <li key={songKey(s)}>
            <button
              type="button"
              onClick={() => player.jump(index + 1 + i)}
              className="flex h-12 w-full items-center gap-3 rounded-lg px-1 text-left hover:bg-accent/60"
            >
              <span className="w-6 text-center font-mono text-sm font-semibold">{s.rank}</span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{s.title}</span>
              <span className="max-w-[40%] truncate text-[13px] text-muted-foreground">
                {s.artist}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
