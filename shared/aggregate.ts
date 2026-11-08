import { type ChartDB, type ChartRangeResult, type RankedChartSong, songKey } from "./api";

/** Parse a 'YYYY-M' / 'YYYY-MM' key into a month index (year * 12 + month0). */
export function monthIndex(key: string): number | null {
  const m = key.match(/^(\d{4})-(\d{1,2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!y || mo < 1 || mo > 12) return null;
  return y * 12 + (mo - 1);
}

export const monthKey = (index: number) =>
  `${Math.floor(index / 12)}-${(index % 12) + 1}`;

/**
 * Merge monthly charts between two months (inclusive) into one ranking.
 * Each monthly position earns (pointsBase + 1 - rank) points; ties go to the
 * song with the better single-month rank.
 */
export function aggregateCharts(
  db: ChartDB,
  from: string,
  to: string,
  limit = 10,
  pointsBase = 50,
): ChartRangeResult | null {
  const start = monthIndex(from);
  const end = monthIndex(to);
  if (start === null || end === null || end < start) return null;

  const bucket = new Map<string, RankedChartSong>();
  const monthsWithData: string[] = [];

  for (let i = start; i <= end; i++) {
    const key = monthKey(i);
    const month = db[key];
    if (!month) continue;
    monthsWithData.push(key);
    for (const song of month.songs) {
      const id = songKey(song);
      const points = Math.max(1, pointsBase + 1 - song.rank);
      const prev = bucket.get(id);
      const top = song.rank === 1 ? [key] : [];
      if (prev) {
        prev.score += points;
        if (song.rank < prev.bestRank) prev.bestMonth = key;
        prev.bestRank = Math.min(prev.bestRank, song.rank);
        prev.numberOneMonths.push(...top);
      } else {
        bucket.set(id, {
          ...song,
          score: points,
          bestRank: song.rank,
          numberOneMonths: top,
          bestMonth: key,
        });
      }
    }
  }

  const songs = [...bucket.values()]
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.bestRank - b.bestRank ||
        a.title.localeCompare(b.title),
    )
    .slice(0, limit)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return {
    from: monthKey(start),
    to: monthKey(end),
    months: end - start + 1,
    monthsWithData,
    songs,
  };
}
