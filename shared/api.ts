/** Shared types between client and server */
export interface DemoResponse {
  message: string;
}

/** One row of a monthly chart, as stored in public/data/charts.json. */
export interface ChartEntry {
  rank: number;
  title: string;
  artist: string;
  album?: string;
}

/** public/data/charts.json, written by scripts/crawl_circle_chart.py */
export interface ChartFile {
  source: string;
  top: number;
  updatedAt: string;
  months: Record<string, ChartEntry[]>; // "YYYY-M" → ranks
}

/** public/data/youtube.json: "artist|title" → YouTube video id */
export type YouTubeMap = Record<string, string>;

export interface ChartSong extends ChartEntry {
  youtubeId?: string; // missing until a video is matched
}

export interface ChartMonth {
  month: string; // YYYY-M
  songs: ChartSong[];
}

export type ChartDB = Record<string, ChartMonth>;

export interface RankedChartSong extends ChartSong {
  score: number; // summed rank points across the period
  bestRank: number; // best monthly rank inside the period
  numberOneMonths: string[]; // 'YYYY-M' months it was #1 inside the period
  bestMonth: string; // 'YYYY-M' month of bestRank (earliest on ties)
}

export interface ChartRangeResult {
  from: string; // YYYY-M
  to: string; // YYYY-M
  months: number; // months requested
  monthsWithData: string[]; // YYYY-M keys that had chart data
  songs: RankedChartSong[];
}

/** Key used to attach a YouTube video to a chart song. */
export const songKey = (s: { artist: string; title: string }) =>
  `${s.artist}|${s.title}`;
