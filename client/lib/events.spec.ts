import { afterEach, describe, expect, it, vi } from "vitest";
import { eventDateLabel, listEvents } from "./events";
import { apiMemoryStore } from "./memories";

vi.mock("./device", () => ({ deviceToken: () => "test-device-token-1234" }));

const reply = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe("timeline months", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("labels the day, or only the month when the day is unknown", () => {
    expect(eventDateLabel({ date: "2020-02-22", month: "2020-02" })).toBe(
      "2020년 2월 22일",
    );
    expect(eventDateLabel({ date: null, month: "2020-07" })).toBe("2020년 7월");
  });

  it("lists major issues in a month range", async () => {
    const fetch = vi.fn(() => reply(200, { events: [{ id: "x" }] }));
    vi.stubGlobal("fetch", fetch);
    expect(await listEvents({ from: "2021-10", to: "2023-04" })).toEqual([
      { id: "x" },
    ]);
    expect(fetch.mock.calls[0]).toContain(
      "/api/events?from=2021-10&to=2023-04",
    );
  });

  it("writes a record straight to a month, with no song", async () => {
    const fetch = vi.fn(() => reply(201, { post: { id: "9" } }));
    vi.stubGlobal("fetch", fetch);
    await apiMemoryStore.addMonth({
      aboutMonth: "2020-02",
      body: "휴가 하루 전",
      rank: "상병",
      hobong: 3,
      author: { cohortMonth: "2019-05", branch: "육군", isReserve: true },
    });
    const init = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(init.body as string)).toEqual({
      kind: "record",
      aboutMonth: "2020-02",
      body: "휴가 하루 전",
      rank: "상병",
      hobong: 3,
      cohortMonth: "2019-05",
      branch: "육군",
      isReserve: true,
    });
  });
});
