import { describe, expect, it } from "vitest";
import { parseISO, format } from "date-fns";
import {
  type ServiceBranch,
  dischargeDate,
  serviceLength,
} from "./serviceLength";

const d = (s: string) => parseISO(s);
const out = (b: ServiceBranch, s: string) =>
  format(dischargeDate(b, d(s)), "yyyy-MM-dd");
const cut = (b: ServiceBranch, s: string) =>
  serviceLength(b, d(s)).reductionDays;

// Rows from 병역법 시행령 [별표 5] 단축조견표 and 국방부 안내
describe("2차 단축 (2018~2021, 2주 단위 1일)", () => {
  it("육군 조견표", () => {
    expect(out("육군", "2017-01-02")).toBe("2018-10-01"); // 단축 전: 21개월 그대로
    expect(cut("육군", "2017-01-02")).toBe(0);
    expect(out("육군", "2017-01-03")).toBe("2018-10-01"); // 1일
    expect(cut("육군", "2017-01-16")).toBe(1);
    expect(cut("육군", "2017-01-17")).toBe(2);
    expect(out("육군", "2017-05-09")).toBe("2019-01-29"); // 10일
    expect(cut("육군", "2018-02-13")).toBe(30);
    expect(out("육군", "2019-04-09")).toBe("2020-11-09"); // 60일
    expect(cut("육군", "2020-03-24")).toBe(85);
    expect(cut("육군", "2020-05-19")).toBe(89);
    expect(out("육군", "2020-06-15")).toBe("2021-12-14"); // 90일
    expect(serviceLength("육군", d("2020-06-16"))).toEqual({
      months: 18,
      reductionDays: 0,
    });
  });

  it("해병대는 육군과 같다", () => {
    expect(out("해병대", "2019-04-09")).toBe(out("육군", "2019-04-09"));
  });

  it("해군 조견표", () => {
    expect(cut("해군", "2016-11-02")).toBe(0);
    expect(cut("해군", "2016-11-03")).toBe(1);
    expect(cut("해군", "2020-03-19")).toBe(89);
    expect(out("해군", "2020-04-15")).toBe("2021-12-14"); // 90일
    expect(serviceLength("해군", d("2020-04-16"))).toEqual({
      months: 20,
      reductionDays: 0,
    });
  });

  it("공군 조견표", () => {
    expect(cut("공군", "2016-10-03")).toBe(1);
    expect(cut("공군", "2020-02-17")).toBe(89);
    expect(out("공군", "2020-03-15")).toBe("2021-12-14"); // 90일
    expect(serviceLength("공군", d("2020-03-16"))).toEqual({
      months: 21,
      reductionDays: 0,
    });
  });
});

describe("카투사·공익(사회복무요원)", () => {
  it("카투사는 육군과 같다", () => {
    expect(out("카투사", "2019-04-09")).toBe(out("육군", "2019-04-09"));
    expect(out("카투사", "2025-03-04")).toBe("2026-09-03");
  });

  it("공익 2차 조견표 (공군과 같은 일정, 24→21개월)", () => {
    expect(cut("공익", "2016-10-02")).toBe(0);
    // 2016-10-03 소집 → 24개월 2018-10-02, 1일 단축 → 2018-10-01 소집해제
    expect(out("공익", "2016-10-03")).toBe("2018-10-01");
    expect(cut("공익", "2016-10-17")).toBe(2);
    expect(cut("공익", "2020-02-17")).toBe(89);
    expect(cut("공익", "2020-03-02")).toBe(90);
    expect(out("공익", "2020-03-15")).toBe("2021-12-14"); // 90일
    expect(serviceLength("공익", d("2020-03-16"))).toEqual({
      months: 21,
      reductionDays: 0,
    });
    expect(out("공익", "2025-03-04")).toBe("2026-12-03");
  });

  it("공익 1차 조견표 (26개월, 4주 단위 1일)", () => {
    expect(cut("공익", "2010-11-24")).toBe(67);
    expect(cut("공익", "2010-12-21")).toBe(67);
    expect(cut("공익", "2010-12-22")).toBe(68);
    expect(cut("공익", "2010-12-31")).toBe(68);
    expect(cut("공익", "2010-11-23")).toBe(66);
    expect(serviceLength("공익", d("2011-01-01"))).toEqual({
      months: 24,
      reductionDays: 0,
    });
    expect(serviceLength("공익", d("2016-10-02"))).toEqual({
      months: 24,
      reductionDays: 0,
    });
  });
});

describe("민법 제160조 월 단위 기간 계산", () => {
  it("일반적인 날짜는 해당일의 전일", () => {
    expect(out("육군", "2021-10-28")).toBe("2023-04-27");
    expect(out("육군", "2022-03-01")).toBe("2023-08-31");
    expect(out("해군", "2022-01-15")).toBe("2023-09-14");
    expect(out("공군", "2022-01-15")).toBe("2023-10-14");
  });

  it("최종 월에 해당일이 없으면 그 달 말일", () => {
    expect(out("육군", "2021-08-31")).toBe("2023-02-28"); // 2/31 없음
    expect(out("육군", "2022-08-31")).toBe("2024-02-29"); // 윤년
    expect(out("육군", "2021-08-30")).toBe("2023-02-28"); // 2/30 없음
    expect(out("육군", "2021-08-29")).toBe("2023-02-28"); // 2/29 없음 (평년)
    expect(out("육군", "2021-08-28")).toBe("2023-02-27"); // 2/28 있음
    expect(out("육군", "2021-05-31")).toBe("2022-11-30"); // 11/31 없음
    expect(out("해군", "2021-06-30")).toBe("2023-02-28");
  });
});

describe("1차 단축 (~2011, 3주·2주 단위 1일) 후 동결", () => {
  it("육군 조견표", () => {
    expect(cut("육군", "2010-11-21")).toBe(86);
    expect(cut("육군", "2010-12-11")).toBe(86);
    expect(cut("육군", "2010-12-12")).toBe(87);
    expect(cut("육군", "2011-01-01")).toBe(87);
    expect(cut("육군", "2011-01-02")).toBe(88);
    expect(cut("육군", "2011-01-16")).toBe(89);
    expect(cut("육군", "2011-01-30")).toBe(90);
    expect(cut("육군", "2011-02-26")).toBe(91);
    expect(serviceLength("육군", d("2011-02-27"))).toEqual({
      months: 21,
      reductionDays: 0,
    });
    expect(cut("육군", "2010-11-20")).toBe(85); // 앞 3주 구간
  });

  it("해군 조견표", () => {
    expect(cut("해군", "2010-11-23")).toBe(89);
    expect(cut("해군", "2010-12-14")).toBe(90);
    expect(cut("해군", "2011-01-02")).toBe(90);
    expect(serviceLength("해군", d("2011-01-03"))).toEqual({
      months: 23,
      reductionDays: 0,
    });
  });

  it("공군 조견표", () => {
    expect(cut("공군", "2010-11-13")).toBe(90);
    expect(cut("공군", "2010-12-04")).toBe(91);
    expect(cut("공군", "2010-12-25")).toBe(92);
    expect(cut("공군", "2010-12-31")).toBe(92);
    expect(serviceLength("공군", d("2011-01-01"))).toEqual({
      months: 24,
      reductionDays: 0,
    });
  });
});
