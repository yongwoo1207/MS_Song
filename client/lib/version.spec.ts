import { describe, expect, it } from "vitest";
import { bundleOf } from "./version";

describe("bundleOf", () => {
  it("finds the entry bundle a built index.html loads", () => {
    const html = `<!doctype html><html><head>
    <script type="module" crossorigin src="/assets/index-BAVg4MpU.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-C7B8h7XG.css">
    </head><body><div id="root"></div></body></html>`;
    expect(bundleOf(html)).toBe("/assets/index-BAVg4MpU.js");
    expect(
      bundleOf('<script src="https://cdn.example/assets/a-1.js"></script>'),
    ).toBe("/assets/a-1.js");
  });

  it("gives null for a page without one (dev server, error page)", () => {
    expect(
      bundleOf('<script type="module" src="/client/App.tsx"></script>'),
    ).toBeNull();
    expect(bundleOf("Service unavailable")).toBeNull();
  });
});
