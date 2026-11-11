import {
  addDays,
  addYears,
  differenceInCalendarDays,
  startOfDay,
} from "date-fns";
import type { Rank, RankPeriod, ServicePlan } from "./service";

/** Labelled date with its D-day count from today (0 = today). */
export interface Milestone {
  label: string;
  date: Date;
  daysLeft: number;
}

export interface ServingStatus {
  status: "serving";
  /** 전역까지 남은 일수 (D-n) */
  daysLeft: number;
  /** 오늘이 복무 며칠째인지 (입대일 = 1일째) */
  dayOfService: number;
  /** 0~100, 소수 첫째 자리 버림 */
  progress: number;
  current: RankPeriod;
  /** 현재 계급으로 며칠째 (진급일 = 1일째) */
  dayOfRank: number;
  /** 다음 진급, 병장이면 null */
  nextPromotion: Milestone | null;
  /** 앞으로 다가오는 날 (절반, 남은 진급, 전역), 가까운 순 */
  upcoming: Milestone[];
}

export interface DoneStatus {
  status: "done";
  /** 전역 후 지난 일수 (D+n) */
  daysSince: number;
  /** 지금 예비군 / 민방위 몇 년차인지 */
  reserve: ReserveStage;
  /** 다가오는 입대·전역 기념일과 예비군·민방위 날, 가까운 순 */
  anniversaries: Milestone[];
}

/** year 0: 전역한 해 (예비군 1년차는 다음 해부터) */
export interface ReserveStage {
  kind: "예비군" | "민방위";
  year: number;
}

export interface NotYetStatus {
  status: "notYet";
  daysLeft: number; // 입대까지
  /** 전역까지 남은 일수 */
  dischargeDaysLeft: number;
  /** 입대 · 진급 · 전역 예정일, 가까운 순 */
  upcoming: Milestone[];
}

export type DdayStatus = ServingStatus | DoneStatus | NotYetStatus;

const days = (from: Date, to: Date) => differenceInCalendarDays(to, from);

const milestone = (label: string, date: Date, today: Date): Milestone => ({
  label,
  date,
  daysLeft: days(today, date),
});

/** 다음 N주년 (오늘 이후 가장 가까운 기념일) */
function nextAnniversary(label: string, base: Date, today: Date): Milestone {
  let years = Math.max(1, today.getFullYear() - base.getFullYear());
  let date = addYears(base, years);
  while (date < today) date = addYears(base, ++years);
  return milestone(`${label} ${years}주년`, date, today);
}

/**
 * 예비군 (병 출신, 보충역 포함): 전역 후 8년이 되는 해 12월 31일까지 편성.
 * 연차 = 올해 − 전역 연도, 전역한 다음 해가 1년차 (병무청).
 * 민방위: 예비군이 끝난 다음 해 1월 1일부터 편성, 만 40세가 되는 해
 * 12월 31일까지 (민방위기본법 제18조, 예비군은 편성 제외). 나이는 모르니
 * 끝나는 날은 내지 않는다.
 */
export const RESERVE_YEARS = 8;

export function reserveStage(discharge: Date, today: Date): ReserveStage {
  const n = today.getFullYear() - discharge.getFullYear();
  return n <= RESERVE_YEARS
    ? { kind: "예비군", year: n }
    : { kind: "민방위", year: n - RESERVE_YEARS };
}

function reserveMilestones(discharge: Date, today: Date): Milestone[] {
  const out = discharge.getFullYear();
  const n = today.getFullYear() - out;
  const newYear = new Date(today.getFullYear() + 1, 0, 1);
  if (n > RESERVE_YEARS) {
    return [milestone(`민방위 ${n - RESERVE_YEARS + 1}년차`, newYear, today)];
  }
  return [
    ...(n < RESERVE_YEARS
      ? [milestone(`예비군 ${n + 1}년차`, newYear, today)]
      : []),
    milestone("예비군 끝", new Date(out + RESERVE_YEARS, 11, 31), today),
    milestone("민방위 시작", new Date(out + RESERVE_YEARS + 1, 0, 1), today),
  ];
}

/** 현역 "다가오는 날" is always this long (절반 + 진급 3번 + 전역). */
export const UPCOMING_LENGTH = 5;

/**
 * Days after 전역 that fill 현역 "다가오는 날" as 진급 pass, most wanted
 * first. 민방위 끝 needs the birth year, which we don't ask.
 */
function afterService(discharge: Date, today: Date): Milestone[] {
  const out = discharge.getFullYear();
  return [
    milestone("예비군 끝", new Date(out + RESERVE_YEARS, 11, 31), today),
    milestone("민방위 시작", new Date(out + RESERVE_YEARS + 1, 0, 1), today),
    milestone("예비군 1년차", new Date(out + 1, 0, 1), today),
    milestone("전역 1주년", addYears(discharge, 1), today),
  ];
}

/** "예비군 3년차", "민방위 1년차"; 전역한 해는 "예비군 편성" */
export const reserveLabel = ({ kind, year }: ReserveStage) =>
  year === 0 ? `${kind} 편성` : `${kind} ${year}년차`;

/** 군생활 절반이 되는 날: 전체 복무일의 가운데 */
export const halfwayDate = (plan: ServicePlan) =>
  addDays(plan.enlist, Math.floor(plan.serviceDays / 2));

export function ddayStatus(
  plan: ServicePlan,
  now: Date = new Date(),
): DdayStatus {
  const today = startOfDay(now);

  if (today < plan.enlist) {
    return {
      status: "notYet",
      daysLeft: days(today, plan.enlist),
      dischargeDaysLeft: days(today, plan.discharge),
      upcoming: [
        milestone("입대", plan.enlist, today),
        ...plan.periods
          .slice(1)
          .map((p) => milestone(`${p.rank} 진급`, p.start, today)),
        milestone("전역", plan.discharge, today),
      ],
    };
  }

  if (today > plan.discharge) {
    return {
      status: "done",
      daysSince: days(plan.discharge, today),
      reserve: reserveStage(plan.discharge, today),
      anniversaries: [
        nextAnniversary("입대", plan.enlist, today),
        nextAnniversary("전역", plan.discharge, today),
        ...reserveMilestones(plan.discharge, today),
      ].sort((a, b) => a.daysLeft - b.daysLeft),
    };
  }

  const dayOfService = days(plan.enlist, today) + 1;
  const current = plan.periods.find((p) => today >= p.start && today <= p.end)!;
  const later = plan.periods.filter((p) => p.start > today);
  const nextPromotion = later[0]
    ? milestone(`${later[0].rank} 진급`, later[0].start, today)
    : null;

  const service = [
    milestone("군생활 절반", halfwayDate(plan), today),
    ...later.map((p) => milestone(`${p.rank} 진급`, p.start, today)),
    milestone("전역", plan.discharge, today),
  ].filter((m) => m.daysLeft >= 0);
  // Keep the list the same length: past 진급 make room for 예비군·민방위
  const upcoming = [
    ...service,
    ...afterService(plan.discharge, today).slice(
      0,
      Math.max(0, UPCOMING_LENGTH - service.length),
    ),
  ].sort((a, b) => a.daysLeft - b.daysLeft);

  return {
    status: "serving",
    daysLeft: days(today, plan.discharge),
    dayOfService,
    progress: Math.floor((dayOfService / plan.serviceDays) * 1000) / 10,
    current,
    dayOfRank: days(current.start, today) + 1,
    nextPromotion,
    upcoming,
  };
}

/** Ranks the user hasn't reached yet: their charts aren't out. */
export function isLockedRank(
  plan: ServicePlan,
  rank: Rank,
  now: Date = new Date(),
): boolean {
  const p = plan.periods.find((x) => x.rank === rank)!;
  return p.start > startOfDay(now);
}

/** "D-12", "D-day", "D+3" */
export const dLabel = (daysLeft: number) =>
  daysLeft === 0 ? "D-day" : daysLeft > 0 ? `D-${daysLeft}` : `D+${-daysLeft}`;
