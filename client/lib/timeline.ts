import { addMonths, differenceInMonths, startOfMonth } from "date-fns";
import type { ChartSong, RankedChartSong } from "@shared/api";
import { monthParam } from "./memories";
import { type Rank, type ServicePlan, chartKey } from "./service";

/** One timeline chapter: a calendar month of the user's service. */
export interface ServiceMonth {
  key: string; // chart key 'YYYY-M'
  param: string; // 'YYYY-MM' (API, about_month)
  label: string; // "2022년 1월"
  rank: Rank; // the user's rank at the start of the month
  hobong: number; // month within that rank, from 1
  current: boolean; // the month we are in now
}

/**
 * 호봉: month within a rank, counted from its promotion day.
 * 일병 진급 12.28 → 12.28~1.27 일병 1호봉, 1.28~ 2호봉.
 */
export function hobongOn(rankStart: Date, day: Date): number {
  return Math.max(0, differenceInMonths(day, rankStart)) + 1;
}

/** Rank and 호봉 on a day, or null outside the service. */
export function rankHobongOn(plan: ServicePlan, day: Date) {
  const period = plan.periods.find((p) => day >= p.start && day <= p.end);
  return period
    ? { rank: period.rank, hobong: hobongOn(period.start, day) }
    : null;
}

/**
 * Months from enlistment to discharge, stopping at the current month.
 * A month's rank/호봉 is the one held on its first day (or enlistment day).
 */
export function serviceMonths(
  plan: ServicePlan,
  now: Date = new Date(),
): ServiceMonth[] {
  const last = plan.discharge < now ? plan.discharge : now;
  const months: ServiceMonth[] = [];
  for (let m = startOfMonth(plan.enlist); m <= last; m = addMonths(m, 1)) {
    const day = m < plan.enlist ? plan.enlist : m;
    const at = rankHobongOn(plan, day);
    if (!at) continue;
    months.push({
      key: chartKey(m),
      param: monthParam(m),
      label: `${m.getFullYear()}년 ${m.getMonth() + 1}월`,
      rank: at.rank,
      hobong: at.hobong,
      current: chartKey(m) === chartKey(now),
    });
  }
  return months;
}

/** A monthly chart row as a playable queue item for that month. */
export const asMonthSong = (song: ChartSong, key: string): RankedChartSong => ({
  ...song,
  score: 0,
  bestRank: song.rank,
  numberOneMonths: song.rank === 1 ? [key] : [],
  bestMonth: key,
});
