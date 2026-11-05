import {
  type ChartDB,
  type ChartFile,
  type YouTubeMap,
  songKey,
} from "@shared/api";

/**
 * Static chart data served from /public/data:
 * - charts.json  monthly TOP N (scripts/crawl_circle_chart.py)
 * - youtube.json "artist|title" → video id
 */
export async function loadChartDB(): Promise<ChartDB> {
  const [charts, videos] = await Promise.all([
    fetchJson<ChartFile>("/data/charts.json"),
    fetchJson<YouTubeMap>("/data/youtube.json").catch(() => ({}) as YouTubeMap),
  ]);

  const db: ChartDB = {};
  for (const [month, entries] of Object.entries(charts.months)) {
    db[month] = {
      month,
      songs: entries.map((e) => ({ ...e, youtubeId: videos[songKey(e)] })),
    };
  }
  return db;
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return (await res.json()) as T;
}
