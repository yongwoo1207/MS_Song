import { describe, expect, it } from "vitest";
import { computeService } from "./service";
import { hobongOn, rankHobongOn, serviceMonths } from "./timeline";

const plan = computeService(new Date(2021, 9, 28), "육군"); // 2021-10-28

describe("hobong", () => {
  it("counts months from the promotion day", () => {
    const pfc = new Date(2021, 11, 28); // 일병 12.28
    expect(hobongOn(pfc, new Date(2021, 11, 28))).toBe(1);
    expect(hobongOn(pfc, new Date(2022, 0, 27))).toBe(1);
    expect(hobongOn(pfc, new Date(2022, 0, 28))).toBe(2);
    expect(rankHobongOn(plan, new Date(2022, 2, 1))).toEqual({
      rank: "일병",
      hobong: 3,
    });
    expect(rankHobongOn(plan, new Date(2030, 0, 1))).toBeNull();
  });
});

describe("serviceMonths", () => {
  it("runs from the enlistment month to discharge", () => {
    const months = serviceMonths(plan, new Date(2026, 10, 8));
    expect(months[0]).toMatchObject({
      key: "2021-10",
      param: "2021-10",
      label: "2021년 10월",
      rank: "이병",
      hobong: 1,
    });
    expect(months[2]).toMatchObject({
      param: "2021-12",
      rank: "이병",
      hobong: 2,
    });
    expect(months[3]).toMatchObject({
      param: "2022-01",
      rank: "일병",
      hobong: 1,
    });
    expect(months[months.length - 1].param).toBe("2023-04"); // discharge 2023-04-27
    expect(months.some((m) => m.current)).toBe(false);
  });

  it("stops at the current month while serving", () => {
    const months = serviceMonths(plan, new Date(2022, 4, 15));
    expect(months[months.length - 1]).toMatchObject({ param: "2022-05", current: true });
  });
});
