/**
 * Major issues (사건) shown on timeline months: operator-curated facts,
 * served by the Worker's /api/events (rows come from db/events.sql).
 */
import type { ApiEvent } from "@shared/posts";
import { apiCall } from "./memories";

export type ServiceEvent = ApiEvent;

export async function listEvents(range: {
  from: string;
  to: string;
}): Promise<ServiceEvent[]> {
  const q = new URLSearchParams(range);
  const data = await apiCall<{ events: ServiceEvent[] }>(`/api/events?${q}`);
  return data.events;
}

/** '2020-02-22' → "2020년 2월 22일", month only → "2020년 2월" */
export function eventDateLabel(e: Pick<ServiceEvent, "date" | "month">) {
  const [y, m, d] = (e.date ?? e.month).split("-");
  return `${y}년 ${Number(m)}월${d ? ` ${Number(d)}일` : ""}`;
}
