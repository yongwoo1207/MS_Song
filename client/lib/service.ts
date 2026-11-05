import {
  addMonths,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns";

export const BRANCHES = ["육군", "해군", "공군", "해병대"] as const;
export type Branch = (typeof BRANCHES)[number];

/** Current mandatory service length in months. */
export const SERVICE_MONTHS: Record<Branch, number> = {
  육군: 18,
  해군: 20,
  공군: 21,
  해병대: 18,
};

export const RANKS = ["이병", "일병", "상병", "병장"] as const;
export type Rank = (typeof RANKS)[number];

export interface RankPeriod {
  rank: Rank;
  start: Date;
  end: Date; // inclusive
  days: number;
  months: number; // rounded length, for display
}

export interface ServicePlan {
  enlist: Date;
  discharge: Date;
  branch: Branch;
  periods: RankPeriod[];
}

/** Optional user corrections: 일병/상병/병장 promotion days and discharge day. */
export interface ServiceOverrides {
  pfc?: Date;
  cpl?: Date;
  sgt?: Date;
  discharge?: Date;
}

export const isBranch = (v: unknown): v is Branch =>
  typeof v === "string" && (BRANCHES as readonly string[]).includes(v);

export function parseDay(value: string | null | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
}

export const toDayParam = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * Standard schedule: 이병 until the 1st of (enlist month + 2), then 6 months as
 * 일병, 6 months as 상병, and 병장 until discharge (enlist + service − 1 day).
 */
export function computeService(
  enlist: Date,
  branch: Branch,
  overrides: ServiceOverrides = {},
): ServicePlan {
  const pfc = overrides.pfc ?? startOfMonth(addMonths(enlist, 2));
  const cpl = overrides.cpl ?? addMonths(pfc, 6);
  const sgt = overrides.sgt ?? addMonths(cpl, 6);
  const discharge =
    overrides.discharge ?? subDays(addMonths(enlist, SERVICE_MONTHS[branch]), 1);

  const starts = [enlist, pfc, cpl, sgt];
  const periods = RANKS.map((rank, i) => {
    const start = starts[i];
    const end = i < 3 ? subDays(starts[i + 1], 1) : discharge;
    const days = differenceInCalendarDays(end, start) + 1;
    return { rank, start, end, days, months: Math.max(1, Math.round(days / 30.44)) };
  });

  return { enlist, discharge, branch, periods };
}

/** True when promotion days are strictly increasing up to discharge. */
export function isOrdered(dates: Date[]): boolean {
  return dates.every((d, i) => i === 0 || d.getTime() > dates[i - 1].getTime());
}

/** Rank on a given day, or null outside the service window. */
export function rankOn(plan: ServicePlan, day: Date): Rank | null {
  const p = plan.periods.find((p) => day >= p.start && day <= p.end);
  return p?.rank ?? null;
}

/** 'YYYY-M' chart key for a date. */
export const chartKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}`;
