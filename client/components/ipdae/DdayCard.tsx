import { Share } from "lucide-react";
import type { ServingStatus } from "@/lib/dday";
import { dLabel } from "@/lib/dday";
import { dayWithWeekday } from "@/lib/format";
import type { ServicePlan } from "@/lib/service";
import { cn } from "@/lib/utils";

interface DdayCardProps {
  plan: ServicePlan;
  status: ServingStatus;
  onShare: () => void;
}

/** Dark "전역까지 D-n" card with a rank-segmented progress bar. */
export default function DdayCard({ plan, status, onShare }: DdayCardProps) {
  // segment boundaries as % of total service days
  let acc = 0;
  const marks = plan.periods.slice(0, -1).map((p) => {
    acc += p.days;
    return (acc / plan.serviceDays) * 100;
  });

  return (
    <section
      aria-label="전역 D-day"
      className="flex flex-col gap-3.5 rounded-[20px] bg-foreground px-[18px] pb-4 pt-[18px] text-white"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-ink-soft">전역까지</span>
          <span className="font-mono text-[56px] font-bold leading-none tracking-[-0.02em] min-[380px]:text-[60px]">
            {dLabel(status.daysLeft)}
          </span>
          <span className="mt-1.5 text-sm text-[#E4E6DE]">{dayWithWeekday(plan.discharge)} 전역</span>
        </div>
        <button
          type="button"
          aria-label="D-day 카드 공유"
          onClick={onShare}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#4A4E43] text-white hover:bg-white/10"
        >
          <Share className="size-[18px]" strokeWidth={2} />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <div
          role="progressbar"
          aria-label="복무 진행률"
          aria-valuenow={status.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="relative h-2.5 overflow-hidden rounded-full bg-[#3A3E33]"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[#B8C78F]"
            style={{ width: `${status.progress}%` }}
          />
          {marks.map((m) => (
            <div key={m} className="absolute inset-y-0 w-0.5 bg-foreground" style={{ left: `${m}%` }} />
          ))}
        </div>
        <div className="flex text-[11px] text-[#A9AD9F]" aria-hidden="true">
          {plan.periods.map((p) => (
            <span
              key={p.rank}
              style={{ flexGrow: p.days }}
              className={cn(
                "min-w-max basis-0 pr-1",
                p.rank === status.current.rank && "font-bold text-white",
              )}
            >
              {p.rank}
            </span>
          ))}
        </div>
        <span className="text-[13px] text-[#E4E6DE]">
          {status.dayOfService.toLocaleString()}일째 복무 중 ·{" "}
          <span className="font-mono font-semibold">{status.progress.toFixed(1)}%</span>
        </span>
      </div>
    </section>
  );
}
