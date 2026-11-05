import { format } from "date-fns";

/** 2023.03.06 */
export const fullDot = (d: Date) => format(d, "yyyy.MM.dd");
/** 23.03.06 */
export const shortDot = (d: Date) => format(d, "yy.MM.dd");
/** 03.06 within the reference year, 24.05.01 otherwise */
export const relDot = (d: Date, refYear: number) =>
  d.getFullYear() === refYear ? format(d, "MM.dd") : format(d, "yy.MM.dd");

export const youtubeWatch = (id: string) => `https://www.youtube.com/watch?v=${id}`;
/** Anonymous playlist of up to 50 ids, opens in the YouTube app on phones. */
export const youtubeQueue = (ids: string[]) =>
  `https://www.youtube.com/watch_videos?video_ids=${ids.slice(0, 50).join(",")}`;
