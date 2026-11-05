import { describe, expect, it } from "vitest";
import { computeService, parseDay, rankOn, toDayParam } from "./service";

describe("computeService", () => {
  const enlist = parseDay("2023-03-06")!;

  it("matches the standard 육군 schedule", () => {
    const plan = computeService(enlist, "육군");
    expect(toDayParam(plan.discharge)).toBe("2024-09-05");
    expect(plan.periods.map((p) => toDayParam(p.start))).toEqual([
      "2023-03-06",
      "2023-05-01",
      "2023-11-01",
      "2024-05-01",
    ]);
    expect(plan.periods.map((p) => p.months)).toEqual([2, 6, 6, 4]);
    expect(toDayParam(plan.periods[0].end)).toBe("2023-04-30");
  });

  it("applies branch length and overrides", () => {
    const plan = computeService(enlist, "공군", { sgt: parseDay("2024-06-01")! });
    expect(toDayParam(plan.discharge)).toBe("2024-12-05");
    expect(toDayParam(plan.periods[2].end)).toBe("2024-05-31");
  });

  it("finds the rank on a day", () => {
    const plan = computeService(enlist, "육군");
    expect(rankOn(plan, parseDay("2023-07-01")!)).toBe("일병");
    expect(rankOn(plan, parseDay("2025-01-01")!)).toBeNull();
  });
});
