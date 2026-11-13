/**
 * 다른 입대일 노래: looking at the charts of an enlistment day that isn't
 * mine. The browsed day lives in its own query keys (od / ob) next to the
 * visitor's own ?d=…&b=…, so looking around never touches their own dates
 * (nothing here writes to the saved enlistment either).
 */
import { addYears, startOfDay } from "date-fns";
import {
  type Branch,
  type ServicePlan,
  computeService,
  isBranch,
  parseDay,
  toDayParam,
} from "./service";

/** Chart data starts with Feb 2010. */
export const CHART_MIN_DAY = "2010-02-01";
/** 입대 예정자: days up to this many years ahead count. */
export const FUTURE_YEARS = 2;

/** Latest enlistment day the forms accept, as 'YYYY-MM-DD'. */
export const maxEnlistDay = (now: Date = new Date()) =>
  toDayParam(addYears(startOfDay(now), FUTURE_YEARS));

/** True for a 'YYYY-MM-DD' this service can draw charts and a D-day for. */
export function inEnlistRange(
  value: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!value || !parseDay(value)) return false;
  return value >= CHART_MIN_DAY && value <= maxEnlistDay(now);
}

/** Query keys of the browsed enlistment, kept apart from `d` and `b`. */
export const BROWSE_DAY = "od";
export const BROWSE_BRANCH = "ob";

export interface Browsed {
  day: string; // 'YYYY-MM-DD'
  branch: Branch;
}

/** The browsed enlistment in the URL; null when absent or out of range. */
export function parseBrowsed(
  params: URLSearchParams,
  now: Date = new Date(),
): Browsed | null {
  const day = params.get(BROWSE_DAY);
  const branch = params.get(BROWSE_BRANCH);
  if (!inEnlistRange(day, now) || !isBranch(branch)) return null;
  return { day: day!, branch };
}

/** The ranks and dates of a browsed enlistment (no user corrections). */
export const browsedPlan = (b: Browsed): ServicePlan =>
  computeService(parseDay(b.day)!, b.branch);

/** The same query with the browsed enlistment swapped in. */
export function withBrowsed(
  params: URLSearchParams,
  { day, branch }: Browsed,
): URLSearchParams {
  const next = new URLSearchParams(params);
  next.set(BROWSE_DAY, day);
  next.set(BROWSE_BRANCH, branch);
  return next;
}

/**
 * An enlistment day whole years from this one ("1년 선배" is -1), or null
 * when that lands outside the range the charts cover.
 */
export function shiftYears(
  enlist: Date,
  years: number,
  now: Date = new Date(),
): string | null {
  const day = toDayParam(addYears(enlist, years));
  return inEnlistRange(day, now) ? day : null;
}
