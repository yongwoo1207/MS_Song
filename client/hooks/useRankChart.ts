import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { aggregateCharts } from "@shared/aggregate";
import { loadChartDB } from "@/lib/charts";
import { type RankPeriod, chartKey } from "@/lib/service";

/** All monthly charts, loaded once from the static JSON files. */
export const useChartDB = () =>
  useQuery({ queryKey: ["chart-db"], queryFn: loadChartDB, staleTime: Infinity });

/** Merged chart for one rank's months, computed in the browser. */
export function useRankChart(period: RankPeriod) {
  const db = useChartDB();
  const from = chartKey(period.start);
  const to = chartKey(period.end);
  const data = useMemo(
    () => (db.data ? (aggregateCharts(db.data, from, to) ?? undefined) : undefined),
    [db.data, from, to],
  );
  return { data, isLoading: db.isLoading, isError: db.isError };
}
