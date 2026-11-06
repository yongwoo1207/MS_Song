import { Share } from "lucide-react";
import type { DoneStatus } from "@/lib/dday";
import { fullDot } from "@/lib/format";
import type { ServicePlan } from "@/lib/service";
import { cn } from "@/lib/utils";

const SHADES = ["bg-rank-1", "bg-rank-2", "bg-rank-3", "bg-rank-4"];

/** "전역한 지 D+n" card with the finished rank timeline. */
export default function DoneCard({
  plan,
  status,
  onShare,
}: {
  plan: ServicePlan;
  status: DoneStatus;
  onShare: () => void;
}) {
  return (
    <section
      aria-label="전역 D+"
      className="flex flex-col gap-3.5 rounded-[20px] border bg-card p-[18px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] text-muted-foreground">전역한 지</span>
          <span className="font-mono text-[56px] font-bold leading-none tracking-[-0.02em] text-primary min-[380px]:text-[60px]">
            D+{status.daysSince.toLocaleString()}
          </span>
          <span className="mt-1.5 text-sm text-muted-foreground">
            {fullDot(plan.discharge)} 전역 · 총 {plan.serviceDays.toLocaleString()}일 복무
          </span>
        </div>
        <button
          type="button"
          aria-label="전역 카드 공유"
          onClick={onShare}
          className="flex size-11 shrink-0 items-center justify-center rounded-full border text-foreground hover:bg-muted"
        >
          <Share className="size-[18px]" strokeWidth={2} />
        </button>
      </div>
      <div className="flex flex-col gap-1.5" aria-hidden="true">
        <div className="flex h-2.5 gap-0.5">
          {plan.periods.map((p, i) => (
            <div
              key={p.rank}
              style={{ flexGrow: p.days }}
              className={cn("basis-0", SHADES[i], i === 0 && "rounded-l-full", i === 3 && "rounded-r-full")}
            />
          ))}
        </div>
        <div className="flex text-[11px] text-muted-foreground">
          {plan.periods.map((p) => (
            <span key={p.rank} style={{ flexGrow: p.days }} className="min-w-max basis-0 pr-1">
              {p.rank}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
