/** Shared types between client and server */
export interface DemoResponse {
  message: string;
}

export interface ChartSong {
  rank: number;
  title: string;
  artist: string;
  youtubeId: string; // YouTube video ID
}

export interface ChartMonth {
  month: string; // YYYY-MM
  songs: ChartSong[];
}

export type ChartDB = Record<string, ChartMonth>;

export interface ChartResult {
  month: string; // matched month
  exactMatch: boolean;
  songs: ChartSong[];
}
