import { afterEach, describe, expect, it, vi } from "vitest";
import { apiMemoryStore, postContext } from "./memories";
import {
  type Notification,
  notificationApi,
  notificationHref,
  notificationText,
} from "./notifications";

vi.mock("./device", () => ({ deviceToken: () => "test-device-token-1234" }));

const reply = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

const post = (p: Partial<Notification["post"]>): Notification["post"] => ({
  kind: "record",
  title: null,
  body: "본문",
  songTitle: null,
  rank: null,
  aboutMonth: null,
  parentId: null,
  ...p,
});
const like = (
  p: Partial<Notification["post"]>,
  count = 3,
  type: Notification["type"] = "like",
): Notification => ({
  type,
  postId: "1",
  count,
  unread: 1,
  lastAt: "2026-11-09T00:00:00.000Z",
  post: post(p),
});

describe("notificationText", () => {
  it("names what was liked or answered", () => {
    expect(notificationText(like({ songTitle: "LOVE DIVE" }))).toBe(
      "'LOVE DIVE'에 남긴 추억에 공감 3개가 달렸어요",
    );
    expect(notificationText(like({ kind: "post" }, 1))).toBe(
      "내 커뮤니티 글에 공감 1개가 달렸어요",
    );
    expect(
      notificationText(like({ kind: "post", title: "휴가 계획" }, 2)),
    ).toBe("'휴가 계획'에 공감 2개가 달렸어요");
    const answered = like({ kind: "talk" }, 2, "reply");
    expect(notificationText(answered)).toBe(
      "내 소통 글에 2명이 댓글을 달았어요",
    );
    expect(notificationHref(answered)).toBe("/talk/1");
    expect(notificationText(like({ kind: "reply" }, 1, "reply"))).toBe(
      "내 댓글에 1명이 답글을 달았어요",
    );
    expect(notificationHref(like({ kind: "reply", parentId: "t9" }))).toBe(
      "/talk/t9",
    );
    expect(notificationHref(like({ songTitle: "x" }))).toBe("/me");
  });
});

describe("postContext", () => {
  const base = {
    kind: "post",
    song: null,
    title: null,
    replyTo: null,
  } as const;
  it("says where a post lives", () => {
    expect(
      postContext({
        ...base,
        song: { key: "a|b", title: "Hype Boy", artist: "NewJeans" },
      }),
    ).toBe("♪ Hype Boy · NewJeans");
    expect(postContext(base)).toBe("커뮤니티 글");
    expect(postContext({ ...base, title: "휴가 계획" })).toBe(
      "커뮤니티 · 휴가 계획",
    );
    expect(postContext({ ...base, kind: "talk" })).toBe("선후임 소통 글");
    expect(postContext({ ...base, kind: "reply" })).toBe("댓글");
    expect(postContext({ ...base, kind: "reply", replyTo: "c1" })).toBe("답글");
    expect(postContext({ ...base, kind: "reply" })).toBe("댓글");
  });
});

describe("activity API", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("hits the right endpoints", async () => {
    const fetch = vi.fn((url: string, _init?: RequestInit) =>
      reply(
        200,
        url.includes("count=1")
          ? { unread: 2 }
          : url.includes("song-counts")
            ? { counts: { "a|b": 1 } }
            : url.includes("songs/like")
              ? { liked: true, likes: 1 }
              : url === "/api/posts"
                ? { post: {} }
                : { posts: [] },
      ),
    );
    vi.stubGlobal("fetch", fetch);
    expect(await notificationApi.unread()).toBe(2);
    // An older Worker without hearts still works
    expect(await apiMemoryStore.songStats()).toEqual({
      counts: { "a|b": 1 },
      likes: {},
      liked: [],
    });
    await apiMemoryStore.listMine();
    await apiMemoryStore.toggleSongLike("a|b");
    await apiMemoryStore.feed("music", "일병", "c");
    await apiMemoryStore.feed("all", "예비역");
    await apiMemoryStore.feed("talk", "입대 예정");
    await apiMemoryStore.addPost({
      kind: "talk",
      title: "제목",
      body: "그때",
      rank: null,
      author: {
        cohortMonth: "2021-03",
        branch: "육군",
        isReserve: false,
        daysToEnlist: 23,
      },
    });
    expect(fetch.mock.calls.map((c) => c[0])).toEqual([
      "/api/notifications?count=1",
      "/api/song-counts",
      "/api/me/posts",
      "/api/songs/like",
      `/api/posts?feed=music&limit=20&rank=${encodeURIComponent("일병")}&before=c`,
      "/api/posts?feed=all&limit=20&who=reserve",
      "/api/posts?feed=talk&limit=20&who=pre",
      "/api/posts",
    ]);
    expect(
      JSON.parse(
        fetch.mock.calls[fetch.mock.calls.length - 1][1]!.body as string,
      ),
    ).toEqual({
      kind: "talk",
      title: "제목",
      body: "그때",
      rank: null,
      cohortMonth: "2021-03",
      branch: "육군",
      isReserve: false,
      daysToEnlist: 23,
    });
  });
});
