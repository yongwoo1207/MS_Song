import { afterEach, describe, expect, it, vi } from "vitest";
import {
  apiMemoryStore,
  cohortLabel,
  cohortMonthOf,
  monthParam,
  timeAgo,
} from "./memories";

vi.mock("./device", () => ({ deviceToken: () => "test-device-token-1234" }));

const reply = (status: number, body?: unknown) =>
  Promise.resolve(
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  );

describe("apiMemoryStore", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lists a song's posts a page at a time, with the device header", async () => {
    const fetch = vi.fn(() =>
      reply(200, { posts: [{ id: "1" }], next: "2026-11-01T00:00:00.000Z|1" }),
    );
    vi.stubGlobal("fetch", fetch);
    const page = await apiMemoryStore.list("IVE (아이브)|LOVE DIVE");
    expect(page).toEqual({
      posts: [{ id: "1" }],
      next: "2026-11-01T00:00:00.000Z|1",
    });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    const song = new URLSearchParams({ song: "IVE (아이브)|LOVE DIVE" });
    expect(url).toBe(`/api/posts?${song}&limit=20`);
    await apiMemoryStore.list("a|b", page.next!);
    expect((fetch.mock.calls[1] as unknown as [string])[0]).toBe(
      `/api/posts?song=a%7Cb&limit=20&before=${encodeURIComponent(page.next!)}`,
    );
    expect((init.headers as Record<string, string>)["X-Device-Token"]).toBe(
      "test-device-token-1234",
    );
  });

  it("posts a record with the author fields flattened", async () => {
    const fetch = vi.fn(() => reply(201, { post: { id: "9" } }));
    vi.stubGlobal("fetch", fetch);
    await apiMemoryStore.add({
      song: { key: "a|b", title: "b", artist: "a" },
      body: "추억",
      rank: "일병",
      aboutMonth: "2022-01",
      author: { cohortMonth: "2021-10", branch: "육군", isReserve: true },
    });
    const init = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      kind: "record",
      song: { key: "a|b", title: "b", artist: "a" },
      body: "추억",
      rank: "일병",
      aboutMonth: "2022-01",
      cohortMonth: "2021-10",
      branch: "육군",
      isReserve: true,
    });
  });

  it("surfaces the server's error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => reply(429, { error: "조금 뒤에 다시 남겨주세요" })),
    );
    await expect(apiMemoryStore.remove("x")).rejects.toThrow(
      "조금 뒤에 다시 남겨주세요",
    );
  });
});

describe("listMonths", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("asks for a month range, optionally one cohort", async () => {
    const fetch = vi.fn(() => reply(200, { posts: [] }));
    vi.stubGlobal("fetch", fetch);
    await apiMemoryStore.listMonths({
      from: "2021-10",
      to: "2023-04",
      cohort: "2021-10",
    });
    expect((fetch.mock.calls[0] as unknown as [string])[0]).toBe(
      "/api/posts?from=2021-10&to=2023-04&cohort=2021-10",
    );
  });
});

describe("labels", () => {
  it("formats cohort and relative time", () => {
    expect(cohortMonthOf(new Date(2021, 9, 28))).toBe("2021-10");
    expect(cohortLabel("2021-10")).toBe("2021년 10월 군번");
    expect(monthParam("2022-1")).toBe("2022-01");
    expect(monthParam(new Date(2022, 11, 5))).toBe("2022-12");
    const now = new Date("2026-11-08T12:00:00Z");
    expect(timeAgo("2026-11-08T11:59:30Z", now)).toBe("방금 전");
    expect(timeAgo("2026-11-08T11:00:00Z", now)).toBe("1시간 전");
    expect(timeAgo("2026-11-06T12:00:00Z", now)).toBe("2일 전");
  });
});
