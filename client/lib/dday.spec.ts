import { describe, expect, it } from "vitest";
import { format, parseISO } from "date-fns";
import { computeService } from "./service";
import {
  dLabel,
  ddayStatus,
  halfwayDate,
  isLockedRank,
  reserveLabel,
} from "./dday";

const day = (s: string) => parseISO(s);
const fmt = (d: Date) => format(d, "yyyy-MM-dd");

describe("ddayStatus (serving)", () => {
  // Numbers from the design: 2026-03-09 육군 입대, today 2026-11-06
  const plan = computeService(day("2026-03-09"), "육군");
  const s = ddayStatus(plan, day("2026-11-06"));

  it("matches the design's D-day card", () => {
    expect(fmt(plan.discharge)).toBe("2027-09-08");
    if (s.status !== "serving") throw new Error(s.status);
    expect(s.daysLeft).toBe(306);
    expect(s.dayOfService).toBe(243);
    expect(s.progress).toBe(44.2);
    // promotions fall on the enlistment day-of-month: 일병 05-09, 상병 11-09
    expect(s.current.rank).toBe("일병");
    expect(s.dayOfRank).toBe(182);
    expect(s.nextPromotion && fmt(s.nextPromotion.date)).toBe("2026-11-09");
    expect(s.nextPromotion?.daysLeft).toBe(3);
  });

  it("lists upcoming days in order", () => {
    if (s.status !== "serving") throw new Error(s.status);
    expect(s.upcoming.map((m) => [m.label, fmt(m.date), m.daysLeft])).toEqual([
      ["상병 진급", "2026-11-09", 3],
      ["군생활 절반", "2026-12-08", 32],
      ["병장 진급", "2027-05-09", 184],
      ["전역", "2027-09-08", 306],
      // 일병 is past: one 예비군·민방위 day keeps five
      ["예비군 끝", "2035-12-31", 3342],
    ]);
    expect(fmt(halfwayDate(plan))).toBe("2026-12-08");
  });

  it("drops past milestones and handles 병장", () => {
    const late = ddayStatus(plan, day("2027-06-01"));
    if (late.status !== "serving") throw new Error(late.status);
    expect(late.current.rank).toBe("병장");
    expect(late.nextPromotion).toBeNull();
    expect(late.upcoming.map((m) => m.label)).toEqual([
      "전역",
      "예비군 1년차",
      "전역 1주년",
      "예비군 끝",
      "민방위 시작",
    ]);
  });

  it("counts discharge day itself as D-day", () => {
    const last = ddayStatus(plan, day("2027-09-08"));
    expect(last.status).toBe("serving");
    if (last.status === "serving") expect(last.daysLeft).toBe(0);
  });

  it("locks ranks not reached yet", () => {
    expect(isLockedRank(plan, "일병", day("2026-11-06"))).toBe(false);
    expect(isLockedRank(plan, "상병", day("2026-11-06"))).toBe(true);
    expect(isLockedRank(plan, "병장", day("2026-11-06"))).toBe(true);
  });
});

describe("ddayStatus (done)", () => {
  const plan = computeService(day("2023-03-06"), "육군");

  it("counts days since discharge and next anniversaries", () => {
    const s = ddayStatus(plan, day("2026-11-06"));
    if (s.status !== "done") throw new Error(s.status);
    expect(s.daysSince).toBe(792);
    // 2024 전역: 2025 1년차 … 2032 8년차, 2033 민방위
    expect(reserveLabel(s.reserve)).toBe("예비군 2년차");
    expect(
      s.anniversaries.map((m) => [m.label, fmt(m.date), m.daysLeft]),
    ).toEqual([
      ["예비군 3년차", "2027-01-01", 56],
      ["입대 4주년", "2027-03-06", 120],
      ["전역 3주년", "2027-09-05", 303],
      ["예비군 끝", "2032-12-31", 2247],
      ["민방위 시작", "2033-01-01", 2248],
    ]);
  });

  it("follows 예비군 years into 민방위", () => {
    const at = (today: string) => {
      const s = ddayStatus(plan, day(today));
      if (s.status !== "done") throw new Error(s.status);
      return {
        now: reserveLabel(s.reserve),
        labels: s.anniversaries.map((m) => m.label),
      };
    };
    // 전역한 해: 1년차는 다음 해부터 (병무청 예시: '24년 전역 → '25년 1년차)
    expect(at("2024-10-01").now).toBe("예비군 편성");
    expect(at("2024-10-01").labels).toContain("예비군 1년차");
    // 7년차: 8년차와 끝, 민방위 시작이 함께
    expect(at("2031-06-01").labels).toEqual(
      expect.arrayContaining(["예비군 8년차", "예비군 끝", "민방위 시작"]),
    );
    // 8년차 마지막 날까지 예비군
    expect(at("2032-12-31").now).toBe("예비군 8년차");
    expect(at("2032-12-31").labels).not.toContain("예비군 9년차");
    expect(at("2033-01-01").now).toBe("민방위 1년차");
    expect(at("2033-01-01").labels).toContain("민방위 2년차");
    expect(at("2033-01-01").labels).not.toContain("예비군 끝");
  });

  it("shows today's anniversary as D-day", () => {
    const s = ddayStatus(plan, day("2025-09-05"));
    if (s.status !== "done") throw new Error(s.status);
    expect(s.anniversaries[0]).toMatchObject({
      label: "전역 1주년",
      daysLeft: 0,
    });
  });
});

describe("ddayStatus (notYet)", () => {
  // 입대 예정자: 2027-03-02 공군, today 2026-11-09
  const plan = computeService(day("2027-03-02"), "공군");
  const s = ddayStatus(plan, day("2026-11-09"));

  it("counts down to enlistment and lists the whole schedule", () => {
    if (s.status !== "notYet") throw new Error(s.status);
    expect(s.daysLeft).toBe(113);
    expect(s.dischargeDaysLeft).toBe(
      s.upcoming[s.upcoming.length - 1].daysLeft,
    );
    expect(s.upcoming.map((m) => m.label)).toEqual([
      "입대",
      "일병 진급",
      "상병 진급",
      "병장 진급",
      "전역",
    ]);
    expect(fmt(s.upcoming[0].date)).toBe("2027-03-02");
    expect(fmt(s.upcoming[4].date)).toBe(fmt(plan.discharge));
  });
});

describe("dLabel", () => {
  it("formats", () => {
    expect(dLabel(5)).toBe("D-5");
    expect(dLabel(0)).toBe("D-day");
    expect(dLabel(-3)).toBe("D+3");
  });
});
