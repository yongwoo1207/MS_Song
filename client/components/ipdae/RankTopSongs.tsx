import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { aggregateCharts } from "@shared/aggregate";
import { useChartDB } from "@/hooks/useRankChart";
import { type ServicePlan, chartRange } from "@/lib/service";
import { Skeleton } from "@/components/ui/skeleton";
import { isLockedRank } from "@/lib/dday";
import { startOfDay } from "date-fns";

/** The #1 song of each rank's period (merged monthly charts). */
export default function RankTopSongs({
  plan,
  listenAll,
}: {
  plan: ServicePlan;
  /** Show the "전체 듣기" link to the 차트 tab */
  listenAll?: boolean;
}) {
  const db = useChartDB();
  const { search } = useLocation();
  const rows = useMemo(
    () =>
      db.data
        ? plan.periods
            .filter((p) => !isLockedRank(plan, p.rank))
            .map((p) => {
              const range = chartRange(p);
              return {
                rank: p.rank,
                ongoing: p.end >= startOfDay(new Date()),
                top: range
                  ? aggregateCharts(db.data!, range.from, range.to)?.songs[0]
                  : undefined,
              };
            })
        : [],
    [db.data, plan],
  );

  return (
    <section className="flex flex-col rounded-2xl border bg-card px-3.5 pb-2.5 pt-1.5">
      <div className="flex items-center justify-between pb-1 pt-2">
        <h2 className="text-sm font-bold">계급별 1위곡</h2>
        {listenAll && (
          <Link
            to={`/result${search}`}
            className="text-xs font-bold text-primary hover:underline"
          >
            전체 듣기
          </Link>
        )}
      </div>
      {db.isLoading && <Skeleton className="h-40 rounded-xl bg-muted" />}
      <ul>
        {rows.map(({ rank, top, ongoing }) => (
          <li
            key={rank}
            className="flex h-10 items-center gap-2.5 border-t border-muted"
          >
            <span className="w-[34px] shrink-0 text-xs text-muted-foreground">
              {rank}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold">
              {top?.title ??
                (ongoing ? "이번 달 차트 집계 중" : "차트 데이터 없음")}
            </span>
            {top && (
              <span className="max-w-[40%] truncate text-xs text-muted-foreground">
                {top.artist}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
