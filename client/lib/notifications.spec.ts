import { afterEach, describe, expect, it, vi } from "vitest";
import { type Memory, apiMemoryStore, postContext } from "./memories";
import {
  type Notification,
  notificationApi,
  notificationText,
} from "./notifications";

vi.mock("./device", () => ({ deviceToken: () => "test-device-token-1234" }));

const reply = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

const post = (p: Partial<Notification["post"]>): Notification["post"] => ({
  kind: "record",
  body: "본문",
  songTitle: null,
  rank: null,
  hobong: null,
  aboutMonth: null,
  ...p,
});
const like = (p: Partial<Notification["post"]>, count = 3): Notification => ({
  type: "like",
  postId: "1",
  count,
  unread: 1,
  lastAt: "2026-11-09T00:00:00.000Z",
  post: post(p),
});

describe("notificationText", () => {
  it("names what was liked", () => {
    expect(notificationText(like({ songTitle: "LOVE DIVE" }))).toBe(
      "'LOVE DIVE'에 남긴 추억에 공감 3개가 달렸어요",
    );
    expect(
      notificationText(like({ kind: "letter", rank: "상병", hobong: 2 }, 1)),
    ).toBe("상병 2호봉에 남긴 한마디에 공감 1개가 달렸어요");
    expect(notificationText(like({ aboutMonth: "2021-03" }))).toBe(
      "2021년 3월 타임라인 기록에 공감 3개가 달렸어요",
    );
  });
});

describe("postContext", () => {
  const base = {
    kind: "record",
    song: null,
    rank: "일병",
    hobong: null,
    aboutMonth: null,
  } as const;
  it("says where a post lives", () => {
    expect(
      postContext({
        ...base,
        song: { key: "a|b", title: "Hype Boy", artist: "NewJeans" },
      }),
    ).toBe("♪ Hype Boy · NewJeans");
    expect(
      postContext({ ...base, kind: "letter", rank: "상병", hobong: 2 }),
    ).toBe("상병 2호봉 후임에게");
    expect(
      postContext({ ...base, aboutMonth: "2022-11" } as Pick<
        Memory,
        "kind" | "song" | "rank" | "hobong" | "aboutMonth"
      >),
    ).toBe("2022년 11월 타임라인");
  });
});

describe("activity API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("hits the right endpoints", async () => {
    const fetch = vi.fn((url: string) =>
      reply(
        200,
        url.includes("count=1")
          ? { unread: 2 }
          : url.includes("song-counts")
            ? { counts: { "a|b": 1 } }
            : { posts: [] },
      ),
    );
    vi.stubGlobal("fetch", fetch);
    expect(await notificationApi.unread()).toBe(2);
    expect(await apiMemoryStore.songCounts()).toEqual({ "a|b": 1 });
    await apiMemoryStore.listMine();
    await apiMemoryStore.listMonths({
      from: "2021-10",
      to: "2023-04",
      songs: true,
    });
    expect(fetch.mock.calls.map((c) => c[0])).toEqual([
      "/api/notifications?count=1",
      "/api/song-counts",
      "/api/me/posts",
      "/api/posts?from=2021-10&to=2023-04&songs=1",
    ]);
  });
});
