import {
  addMonths,
  differenceInCalendarDays,
  format,
  isValid,
  parseISO,
  startOfMonth,
  subMonths,
  subDays,
} from "date-fns";

import { CURRENT_MONTHS, dischargeDate, serviceLength } from "./serviceLength";

/** 군 종류. 카투사는 육군과, 공익(사회복무요원)은 별도 일정으로 센다. */
export const BRANCHES = [
  "육군",
  "해군",
  "공군",
  "해병대",
  "카투사",
  "공익",
] as const;
export type Branch = (typeof BRANCHES)[number];

/** Service length for someone enlisting today, in months. */
export const SERVICE_MONTHS: Record<Branch, number> = CURRENT_MONTHS;

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
  /** 입대일~전역일, 양 끝 포함 */
  serviceDays: number;
  /** 법정 기준 복무개월과 단계적 단축일수 (전역일을 직접 고친 경우에도 법정 값) */
  baseMonths: number;
  reductionDays: number;
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
 * 진급 최저복무기간: 2019-09-01 시행으로 이병·일병·상병 각 1개월씩 단축
 * (3-7-7개월 → 2-6-6개월). 진급일은 직전 계급 시작일과 같은 날짜로 센다
 * (10.28 입대 → 12.28 일병). 시행일에 새 기준을 이미 채운 병사는 시행일에
 * 진급한 것으로 본다.
 */
const PROMOTION_RULE_CHANGE = parseISO("2019-09-01");
const PROMOTION_MONTHS = { old: [3, 7, 7], current: [2, 6, 6] } as const;

function nextPromotion(prev: Date, step: 0 | 1 | 2): Date {
  const old = addMonths(prev, PROMOTION_MONTHS.old[step]);
  if (old < PROMOTION_RULE_CHANGE) return old;
  const current = addMonths(prev, PROMOTION_MONTHS.current[step]);
  return current > PROMOTION_RULE_CHANGE ? current : PROMOTION_RULE_CHANGE;
}

/**
 * Legal schedule: discharge from 병역법 시행령 별표 5 (incl. the gradual
 * 2-week/3-week reductions), promotions by the minimum-service rule of the
 * time. Any date can be overridden by the user.
 */
export function computeService(
  enlist: Date,
  branch: Branch,
  overrides: ServiceOverrides = {},
): ServicePlan {
  const pfc = overrides.pfc ?? nextPromotion(enlist, 0);
  const cpl = overrides.cpl ?? nextPromotion(pfc, 1);
  const sgt = overrides.sgt ?? nextPromotion(cpl, 2);
  const discharge = overrides.discharge ?? dischargeDate(branch, enlist);
  const { months: baseMonths, reductionDays } = serviceLength(branch, enlist);

  const starts = [enlist, pfc, cpl, sgt];
  const periods = RANKS.map((rank, i) => {
    const start = starts[i];
    const end = i < 3 ? subDays(starts[i + 1], 1) : discharge;
    const days = differenceInCalendarDays(end, start) + 1;
    return {
      rank,
      start,
      end,
      days,
      months: Math.max(1, Math.round(days / 30.44)),
    };
  });

  return {
    enlist,
    discharge,
    branch,
    periods,
    serviceDays: differenceInCalendarDays(discharge, enlist) + 1,
    baseMonths,
    reductionDays,
  };
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

/** A period's first month counts when it starts on or before this day. */
const START_CUTOFF_DAY = 20;
/** A period's last month counts when it reaches at least this day. */
const END_CUTOFF_DAY = 10;

/**
 * Chart months for a period: the start month only if the period starts by the
 * 20th (otherwise from the next month), the end month only if the period
 * lasts until the 10th or later (otherwise up to the month before). Null when
 * the period covers no full-enough month.
 */
export function chartRange(
  period: Pick<RankPeriod, "start" | "end">,
): { from: string; to: string } | null {
  const { start, end } = period;
  const first =
    start.getDate() <= START_CUTOFF_DAY
      ? start
      : addMonths(startOfMonth(start), 1);
  const last =
    end.getDate() >= END_CUTOFF_DAY ? end : subMonths(startOfMonth(end), 1);
  if (startOfMonth(last) < startOfMonth(first)) return null;
  return { from: chartKey(first), to: chartKey(last) };
}
