import { useQuery } from "@tanstack/react-query";
import { type ServiceEvent, listEvents } from "@/lib/events";

/** Major issues in a month range, grouped by 'YYYY-MM'. */
export function useEvents(range: { from: string; to: string } | null) {
  return useQuery({
    queryKey: ["events", range?.from, range?.to],
    queryFn: () => listEvents(range!),
    enabled: !!range,
    staleTime: 5 * 60_000,
    retry: 1,
    select: (events) => {
      const byMonth = new Map<string, ServiceEvent[]>();
      for (const e of events) {
        byMonth.set(e.month, [...(byMonth.get(e.month) ?? []), e]);
      }
      return byMonth;
    },
  });
}
