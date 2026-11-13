import { describe, expect, it } from "vitest";
import { parseISO } from "date-fns";
import {
  BROWSE_BRANCH,
  BROWSE_DAY,
  browsedPlan,
  inEnlistRange,
  maxEnlistDay,
  parseBrowsed,
  shiftYears,
  withBrowsed,
} from "./browse";

const NOW = parseISO("2025-06-15");

describe("inEnlistRange", () => {
  it("takes days the charts cover", () => {
    expect(inEnlistRange("2010-02-01", NOW)).toBe(true);
    expect(inEnlistRange("2018-03-19", NOW)).toBe(true);
  });

  it("stops before the charts start and two years out", () => {
    expect(inEnlistRange("2010-01-31", NOW)).toBe(false);
    expect(inEnlistRange("2027-06-15", NOW)).toBe(true);
    expect(inEnlistRange("2027-06-16", NOW)).toBe(false);
  });

  it("refuses nothing and nonsense", () => {
    expect(inEnlistRange(null, NOW)).toBe(false);
    expect(inEnlistRange("", NOW)).toBe(false);
    expect(inEnlistRange("2018-13-40", NOW)).toBe(false);
    expect(inEnlistRange("2018-3-1", NOW)).toBe(false);
  });

  it("maxEnlistDay is two years from today", () => {
    expect(maxEnlistDay(NOW)).toBe("2027-06-15");
  });
});

describe("parseBrowsed", () => {
  const params = (q: string) => new URLSearchParams(q);

  it("reads its own keys, leaving d and b alone", () => {
    const p = params("d=2020-01-06&b=해군&od=2013-03-04&ob=육군");
    expect(parseBrowsed(p, NOW)).toEqual({ day: "2013-03-04", branch: "육군" });
  });

  it("is null without a browsed day, branch, or a valid one", () => {
    expect(parseBrowsed(params("d=2020-01-06&b=해군"), NOW)).toBeNull();
    expect(parseBrowsed(params("od=2013-03-04"), NOW)).toBeNull();
    expect(parseBrowsed(params("od=2013-03-04&ob=해병"), NOW)).toBeNull();
    expect(parseBrowsed(params("od=2009-05-01&ob=육군"), NOW)).toBeNull();
  });

  it("keeps my own query when swapping the browsed day in", () => {
    const next = withBrowsed(params("d=2020-01-06&b=해군"), {
      day: "2013-03-04",
      branch: "공군",
    });
    expect(next.get("d")).toBe("2020-01-06");
    expect(next.get("b")).toBe("해군");
    expect(next.get(BROWSE_DAY)).toBe("2013-03-04");
    expect(next.get(BROWSE_BRANCH)).toBe("공군");
  });
});

describe("browsedPlan", () => {
  it("counts the browsed enlistment like any other", () => {
    const plan = browsedPlan({ day: "2013-03-04", branch: "육군" });
    expect(plan.branch).toBe("육군");
    expect(plan.periods.map((p) => p.rank)).toEqual([
      "이병",
      "일병",
      "상병",
      "병장",
    ]);
    expect(plan.enlist.getMonth()).toBe(2);
  });
});

describe("shiftYears", () => {
  const enlist = parseISO("2024-05-13");

  it("walks whole years from my own 입대일", () => {
    expect(shiftYears(enlist, -1, NOW)).toBe("2023-05-13");
    expect(shiftYears(enlist, 0, NOW)).toBe("2024-05-13");
    expect(shiftYears(enlist, 1, NOW)).toBe("2025-05-13");
  });

  it("is null when that lands outside the range", () => {
    expect(shiftYears(parseISO("2010-06-01"), -1, NOW)).toBeNull();
    expect(shiftYears(parseISO("2027-01-01"), 1, NOW)).toBeNull();
  });
});
