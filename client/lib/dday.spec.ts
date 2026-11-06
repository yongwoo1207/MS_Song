import { describe, expect, it } from "vitest";
import { format, parseISO } from "date-fns";
import { computeService } from "./service";
import { dLabel, ddayStatus, halfwayDate, isLockedRank } from "./dday";

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
    ]);
    expect(fmt(halfwayDate(plan))).toBe("2026-12-08");
  });

  it("drops past milestones and handles 병장", () => {
    const late = ddayStatus(plan, day("2027-06-01"));
    if (late.status !== "serving") throw new Error(late.status);
    expect(late.current.rank).toBe("병장");
    expect(late.nextPromotion).toBeNull();
    expect(late.upcoming.map((m) => m.label)).toEqual(["전역"]);
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
    expect(s.anniversaries.map((m) => [m.label, fmt(m.date), m.daysLeft])).toEqual([
      ["입대 4주년", "2027-03-06", 120],
      ["전역 3주년", "2027-09-05", 303],
    ]);
  });

  it("shows today's anniversary as D-day", () => {
    const s = ddayStatus(plan, day("2025-09-05"));
    if (s.status !== "done") throw new Error(s.status);
    expect(s.anniversaries[0]).toMatchObject({ label: "전역 1주년", daysLeft: 0 });
  });
});

describe("dLabel", () => {
  it("formats", () => {
    expect(dLabel(5)).toBe("D-5");
    expect(dLabel(0)).toBe("D-day");
    expect(dLabel(-3)).toBe("D+3");
  });
});
