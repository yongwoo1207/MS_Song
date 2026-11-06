import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { aggregateCharts } from "@shared/aggregate";
import { loadChartDB } from "@/lib/charts";
import { type RankPeriod, chartRange } from "@/lib/service";

/** All monthly charts, loaded once from the static JSON files. */
export const useChartDB = () =>
  useQuery({ queryKey: ["chart-db"], queryFn: loadChartDB, staleTime: Infinity });

/** Merged chart for one rank's months, computed in the browser. */
export function useRankChart(period: RankPeriod) {
  const db = useChartDB();
  const range = chartRange(period);
  const from = range?.from;
  const to = range?.to;
  const data = useMemo(() => {
    if (!db.data) return undefined;
    if (!from || !to) return { from: "", to: "", months: 0, monthsWithData: [], songs: [] };
    return aggregateCharts(db.data, from, to) ?? undefined;
  }, [db.data, from, to]);
  return { data, isLoading: db.isLoading, isError: db.isError };
}
