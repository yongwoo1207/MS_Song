import { ExternalLink } from "lucide-react";
import { useRankChart } from "@/hooks/useRankChart";
import { toast } from "sonner";
import {
  useSongCounts,
  useSongLikes,
  useToggleSongLike,
} from "@/hooks/useMyPosts";
import type { Player } from "@/hooks/usePlayer";
import { shortDot, youtubeQueue } from "@/lib/format";
import type { RankPeriod } from "@/lib/service";
import type { MemoryAuthor } from "@/lib/memories";
import { Skeleton } from "@/components/ui/skeleton";
import SongRow from "./SongRow";
import { PlayIcon } from "./icons";
import { songKey } from "@shared/api";

interface RankChartPanelProps {
  period: RankPeriod;
  player: Player;
  /** Who a heart is from (it shows on the 음악 board) */
  author: MemoryAuthor;
  /** The rank the user holds now: its chart is still growing */
  current?: boolean;
}

/** Period line, play-all actions and the merged chart for one rank. */
export default function RankChartPanel({
  period,
  player,
  author,
  current,
}: RankChartPanelProps) {
  const { data, isLoading, isError } = useRankChart(period);
  const songs = data?.songs ?? [];
  const playable = songs.filter((s) => s.youtubeId);
  const queued = player.queue?.rank === period.rank;
  const counts = useSongCounts();
  const { likes, liked } = useSongLikes();
  const toggleLike = useToggleSongLike();

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 pb-2 pt-3">
        <span className="font-mono text-xs text-muted-foreground">
          {shortDot(period.start)} – {shortDot(period.end)} · {period.months}
          개월
        </span>
        {current ? (
          <span className="rounded-md bg-accent px-1.5 py-[3px] text-[11px] font-bold text-primary">
            진행 중 · 매달 업데이트
          </span>
        ) : (
          data &&
          songs.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {data.monthsWithData.length}/{data.months}개월 차트 합산
            </span>
          )
        )}
      </div>

      <div className="flex gap-2 px-4 pb-2">
        <button
          type="button"
          disabled={playable.length === 0}
          onClick={() => player.play({ rank: period.rank, songs: playable }, 0)}
          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          <PlayIcon className="size-4" />이 계급 전체 재생
        </button>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2 px-4 pt-2" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl bg-muted" />
          ))}
          <span className="sr-only">차트 불러오는 중</span>
        </div>
      )}

      {(isError || (data && songs.length === 0)) && (
        <p className="mx-4 mt-4 rounded-xl bg-muted px-4 py-6 text-center text-sm leading-relaxed text-muted-foreground">
          {isError
            ? "차트를 불러오지 못했어요. 잠시 후 다시 시도해 주세요."
            : current
              ? "이번 달 차트가 나오면 여기에 쌓여요."
              : "이 시기 차트 데이터가 아직 없어요."}
        </p>
      )}

      {songs.length > 0 && (
        <ol className="flex flex-col px-2">
          {songs.map((song) => {
            const idx = playable.indexOf(song);
            return (
              <SongRow
                key={songKey(song)}
                song={song}
                memories={counts?.[songKey(song)]}
                likes={likes[songKey(song)]}
                liked={liked.has(songKey(song))}
                onLike={() =>
                  toggleLike.mutate(
                    {
                      key: songKey(song),
                      title: song.title,
                      artist: song.artist,
                      rank: period.rank,
                      author,
                    },
                    {
                      onError: (err) => toast(err.message),
                    },
                  )
                }
                active={
                  queued &&
                  !!player.current &&
                  songKey(player.current) === songKey(song)
                }
                onPlay={
                  idx >= 0
                    ? () =>
                        player.play(
                          { rank: period.rank, songs: playable },
                          idx,
                          {
                            openMemories: true,
                          },
                        )
                    : undefined
                }
              />
            );
          })}
        </ol>
      )}

      {playable.length > 0 && (
        <div className="px-4 pb-6 pt-3">
          <a
            href={youtubeQueue(playable.map((s) => s.youtubeId!))}
            target="_blank"
            rel="noreferrer"
            onClick={() => player.setPlaying(false)}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-input bg-card text-sm font-bold text-foreground"
          >
            <ExternalLink className="size-4" strokeWidth={2} />
            {period.rank} 차트 유튜브에서 이어듣기
          </a>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            화면을 끄고 들으려면 유튜브 앱에서 들어주세요.
          </p>
        </div>
      )}
    </div>
  );
}
