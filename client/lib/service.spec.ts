import { describe, expect, it } from "vitest";
import { chartRange, computeService, parseDay, rankOn, toDayParam } from "./service";

describe("computeService", () => {
  const enlist = parseDay("2023-03-06")!;

  it("matches the standard 육군 schedule", () => {
    const plan = computeService(enlist, "육군");
    expect(toDayParam(plan.discharge)).toBe("2024-09-05");
    expect(plan.periods.map((p) => toDayParam(p.start))).toEqual([
      "2023-03-06",
      "2023-05-06",
      "2023-11-06",
      "2024-05-06",
    ]);
    expect(plan.periods.map((p) => p.months)).toEqual([2, 6, 6, 4]);
    expect(toDayParam(plan.periods[0].end)).toBe("2023-05-05");
  });

  it("applies branch length and overrides", () => {
    const plan = computeService(enlist, "공군", { sgt: parseDay("2024-06-01")! });
    expect(toDayParam(plan.discharge)).toBe("2024-12-05");
    expect(toDayParam(plan.periods[2].end)).toBe("2024-05-31");
  });

  it("reports total service days", () => {
    const plan = computeService(enlist, "육군");
    expect(plan.serviceDays).toBe(550); // 2023-03-06 ~ 2024-09-05 (2024 is a leap year)
    expect(plan.reductionDays).toBe(0);
  });

  it("uses 3-7-7 promotions before 2019-09-01", () => {
    const plan = computeService(parseDay("2018-03-05")!, "육군");
    expect(plan.periods.map((p) => toDayParam(p.start))).toEqual([
      "2018-03-05",
      "2018-06-05",
      "2019-01-05",
      "2019-08-05",
    ]);
  });

  it("switches to 2-6-6 promotions mid-service in 2019", () => {
    // 상병 was due 2019-11-07 under the old rule; the new 6-month rule makes it 2019-10-07
    const plan = computeService(parseDay("2019-01-07")!, "육군");
    expect(plan.periods.map((p) => toDayParam(p.start))).toEqual([
      "2019-01-07",
      "2019-04-07",
      "2019-10-07",
      "2020-04-07",
    ]);
    // 상병 on 2019-02-02: the new 6-month rule says 병장 2019-08-02, already past
    // when the rule took effect, so the promotion lands on 2019-09-01
    const late = computeService(parseDay("2018-04-02")!, "육군");
    expect(late.periods.map((p) => toDayParam(p.start))).toEqual([
      "2018-04-02",
      "2018-07-02",
      "2019-02-02",
      "2019-09-01",
    ]);
  });

  it("applies the gradual reduction to the discharge day", () => {
    const plan = computeService(parseDay("2021-10-28")!, "육군");
    expect(toDayParam(plan.discharge)).toBe("2023-04-27"); // 18개월, 단축 없음
    const reduced = computeService(parseDay("2019-04-09")!, "육군");
    expect(toDayParam(reduced.discharge)).toBe("2020-11-09");
    expect(reduced.reductionDays).toBe(60);
  });

  it("finds the rank on a day", () => {
    const plan = computeService(enlist, "육군");
    expect(rankOn(plan, parseDay("2023-07-01")!)).toBe("일병");
    expect(rankOn(plan, parseDay("2025-01-01")!)).toBeNull();
  });
});

describe("chartRange", () => {
  const range = (s: string, e: string) => chartRange({ start: parseDay(s)!, end: parseDay(e)! });

  it("counts the start month only when the period starts by the 20th", () => {
    expect(range("2021-10-20", "2021-12-27")).toEqual({ from: "2021-10", to: "2021-12" });
    expect(range("2021-10-21", "2021-12-27")).toEqual({ from: "2021-11", to: "2021-12" });
  });

  it("counts the end month only when the period reaches the 10th", () => {
    expect(range("2021-10-01", "2021-12-10")).toEqual({ from: "2021-10", to: "2021-12" });
    expect(range("2021-10-01", "2021-12-09")).toEqual({ from: "2021-10", to: "2021-11" });
  });

  it("returns null when no month is covered enough", () => {
    expect(range("2021-10-25", "2021-11-05")).toBeNull();
  });
});
