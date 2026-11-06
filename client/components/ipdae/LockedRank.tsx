import { Lock } from "lucide-react";
import { dLabel } from "@/lib/dday";
import { fullDot } from "@/lib/format";
import type { RankPeriod } from "@/lib/service";
import { differenceInCalendarDays, startOfDay } from "date-fns";

/** Placeholder for a rank the user hasn't reached: its charts aren't out yet. */
export default function LockedRank({ period }: { period: RankPeriod }) {
  const daysLeft = differenceInCalendarDays(period.start, startOfDay(new Date()));
  return (
    <div className="flex flex-col items-center gap-2.5 px-8 pb-28 pt-20 text-center">
      <span
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-full bg-accent text-primary"
      >
        <Lock className="size-7" strokeWidth={2} />
      </span>
      <p className="text-lg font-bold">{period.rank}이 되면 열려요</p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {fullDot(period.start)}부터 {period.rank} 시절 차트가
        <br />
        매달 여기에 쌓여요
      </p>
      <span className="mt-1 rounded-lg bg-accent px-3 py-1.5 font-mono text-[15px] font-bold text-primary">
        {dLabel(daysLeft)}
      </span>
    </div>
  );
}
