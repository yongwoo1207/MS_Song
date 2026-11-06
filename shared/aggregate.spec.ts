import { describe, expect, it } from "vitest";
import { aggregateCharts, monthIndex } from "./aggregate";
import type { ChartDB } from "./api";

const db: ChartDB = {
  "2023-5": {
    month: "2023-5",
    songs: [
      { rank: 1, title: "A", artist: "x", youtubeId: "a" },
      { rank: 2, title: "B", artist: "y", youtubeId: "b" },
    ],
  },
  "2023-6": {
    month: "2023-6",
    songs: [
      { rank: 1, title: "B", artist: "y", youtubeId: "b" },
      { rank: 2, title: "C", artist: "z", youtubeId: "c" },
    ],
  },
};

describe("aggregateCharts", () => {
  it("sums points across months and re-ranks", () => {
    const res = aggregateCharts(db, "2023-5", "2023-7")!;
    expect(res.months).toBe(3);
    expect(res.monthsWithData).toEqual(["2023-5", "2023-6"]);
    expect(res.songs.map((s) => s.title)).toEqual(["B", "A", "C"]);
    expect(res.songs[0].rank).toBe(1);
  });

  it("remembers the months each song was #1", () => {
    const res = aggregateCharts(db, "2023-5", "2023-6")!;
    expect(res.songs.map((s) => [s.title, s.numberOneMonths])).toEqual([
      ["B", ["2023-6"]],
      ["A", ["2023-5"]],
      ["C", []],
    ]);
  });

  it("returns empty songs when no month has data", () => {
    const res = aggregateCharts(db, "2010-2", "2010-3")!;
    expect(res.songs).toEqual([]);
  });

  it("rejects bad ranges", () => {
    expect(aggregateCharts(db, "2023-7", "2023-5")).toBeNull();
    expect(monthIndex("2023-13")).toBeNull();
  });
});
