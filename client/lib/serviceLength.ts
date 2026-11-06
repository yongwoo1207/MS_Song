import { addMonths, differenceInCalendarDays, parseISO, subDays } from "date-fns";

/**
 * 현역병 복무기간 — 병역법 시행령 [별표 5] "현역병 등의 복무기간 단축 시행 계획"
 * (1차: 2008~2011 단축 후 동결, 2차: 2018~2021 단축)
 *
 * 전역일 = 입대일 + 기준 복무개월 − 1일 − 단축일수
 * 예) 육군 2017-01-03 입대: 21개월 → 2018-10-02, 단축 1일 → 2018-10-01 전역
 */

export type ServiceBranch = "육군" | "해군" | "공군" | "해병대";

export interface ServiceLength {
  /** 법정 기준 복무개월 (단축 전) */
  months: number;
  /** 단계적 단축으로 빠지는 일수 */
  reductionDays: number;
}

const day = (s: string) => parseISO(s);
const daysFrom = (from: string, d: Date) => differenceInCalendarDays(d, day(from));

/** 2차 단축: 시작일부터 2주 단위로 1일씩 (첫 2주 = 1일) */
const twoWeekSteps = (start: string, d: Date) => Math.floor(daysFrom(start, d) / 14) + 1;

/**
 * 1차 단축: 3주 단위로 1일씩. 별표의 단축조견표 마지막 3주 구간(anchor)을
 * 기준으로 거꾸로 계산한다. anchor 구간 = anchorDays 일 단축.
 */
const threeWeekSteps = (anchorStart: string, anchorDays: number, d: Date) =>
  anchorDays - Math.ceil(Math.max(0, -daysFrom(anchorStart, d)) / 21);

type Rule = (d: Date) => ServiceLength | null;

const RULES: Record<"army" | "navy" | "airforce", Rule[]> = {
  // 육군·해병대: 24→21개월(1차, 2011-02-27 입대자부터 21개월), 21→18개월(2차)
  army: [
    (d) =>
      d < day("2011-01-02")
        ? { months: 24, reductionDays: threeWeekSteps("2010-12-12", 87, d) }
        : null,
    (d) =>
      d < day("2011-02-27")
        ? { months: 24, reductionDays: 88 + Math.floor(daysFrom("2011-01-02", d) / 14) }
        : null,
    (d) => (d < day("2017-01-03") ? { months: 21, reductionDays: 0 } : null),
    (d) =>
      d < day("2020-06-16")
        ? { months: 21, reductionDays: twoWeekSteps("2017-01-03", d) }
        : null,
    () => ({ months: 18, reductionDays: 0 }),
  ],
  // 해군: 26→23개월(1차, 2011-01-03 입대자부터 23개월), 23→20개월(2차)
  navy: [
    (d) =>
      d < day("2011-01-03")
        ? { months: 26, reductionDays: threeWeekSteps("2010-12-14", 90, d) }
        : null,
    (d) => (d < day("2016-11-03") ? { months: 23, reductionDays: 0 } : null),
    (d) =>
      d < day("2020-04-16")
        ? { months: 23, reductionDays: twoWeekSteps("2016-11-03", d) }
        : null,
    () => ({ months: 20, reductionDays: 0 }),
  ],
  // 공군: 27→24개월(1차, 2011-01-01 입대자부터 24개월), 24→21개월(2차)
  airforce: [
    (d) =>
      d < day("2010-12-25")
        ? { months: 27, reductionDays: threeWeekSteps("2010-12-04", 91, d) }
        : null,
    (d) => (d < day("2011-01-01") ? { months: 27, reductionDays: 92 } : null),
    (d) => (d < day("2016-10-03") ? { months: 24, reductionDays: 0 } : null),
    (d) =>
      d < day("2020-03-16")
        ? { months: 24, reductionDays: twoWeekSteps("2016-10-03", d) }
        : null,
    () => ({ months: 21, reductionDays: 0 }),
  ],
};

const RULE_SET: Record<ServiceBranch, keyof typeof RULES> = {
  육군: "army",
  해병대: "army",
  해군: "navy",
  공군: "airforce",
};

export function serviceLength(branch: ServiceBranch, enlist: Date): ServiceLength {
  for (const rule of RULES[RULE_SET[branch]]) {
    const hit = rule(enlist);
    if (hit) return hit;
  }
  throw new Error("unreachable");
}

/**
 * 민법 제160조: 월로 정한 기간은 최종 월에서 기산일에 해당한 날의 전일로
 * 만료하고, 최종 월에 해당일이 없으면 그 월의 말일로 만료한다.
 * 입영일이 기산일(초일 산입)이다.
 *   2021-10-28 + 18개월 → 2023-04-27
 *   2021-08-31 + 18개월 → 2/31 이 없으므로 2023-02-28 (2/27 이 아님)
 */
export function periodEnd(start: Date, months: number): Date {
  const same = addMonths(start, months); // date-fns clamps 2/31 → 2/28
  const exists = same.getDate() === start.getDate();
  return exists ? subDays(same, 1) : same;
}

/** 법정 전역일 */
export function dischargeDate(branch: ServiceBranch, enlist: Date): Date {
  const { months, reductionDays } = serviceLength(branch, enlist);
  return subDays(periodEnd(enlist, months), reductionDays);
}

/** 오늘 입대하면 적용되는 복무개월 (입력 전 안내용) */
export const CURRENT_MONTHS: Record<ServiceBranch, number> = {
  육군: 18,
  해군: 20,
  공군: 21,
  해병대: 18,
};
