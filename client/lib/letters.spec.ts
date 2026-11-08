import { afterEach, describe, expect, it, vi } from "vitest";
import { apiMemoryStore } from "./memories";

vi.mock("./device", () => ({ deviceToken: () => "test-device-token-1234" }));

const reply = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe("한마디 by 계급·호봉", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("lists letters for one 계급·호봉", async () => {
    const fetch = vi.fn(() => reply(200, { posts: [] }));
    vi.stubGlobal("fetch", fetch);
    await apiMemoryStore.listLetters({ rank: "상병", hobong: 2 });
    expect(fetch.mock.calls[0]).toContain(
      `/api/posts?kind=letter&rank=${encodeURIComponent("상병")}&hobong=2`,
    );
  });

  it("lists only my own letters for a 예비역", async () => {
    const fetch = vi.fn(() => reply(200, { posts: [] }));
    vi.stubGlobal("fetch", fetch);
    await apiMemoryStore.listMyLetters();
    expect(fetch.mock.calls[0]).toContain("/api/posts?kind=letter&mine=1");
  });

  it("posts a letter with the slot and author", async () => {
    const fetch = vi.fn(() => reply(201, { post: { id: "1" } }));
    vi.stubGlobal("fetch", fetch);
    await apiMemoryStore.addLetter({
      rank: "상병",
      hobong: 2,
      body: "버티면 돼요",
      author: { cohortMonth: "2021-10", branch: "육군", isReserve: false },
    });
    const init = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(JSON.parse(init.body as string)).toEqual({
      kind: "letter",
      rank: "상병",
      hobong: 2,
      body: "버티면 돼요",
      cohortMonth: "2021-10",
      branch: "육군",
      isReserve: false,
    });
  });
});
