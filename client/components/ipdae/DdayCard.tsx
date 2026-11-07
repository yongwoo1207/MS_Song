import { ImageDown } from "lucide-react";
import type { ServingStatus } from "@/lib/dday";
import { dLabel } from "@/lib/dday";
import { fullDot } from "@/lib/format";
import type { ServicePlan } from "@/lib/service";
import { cn } from "@/lib/utils";

interface DdayCardProps {
  plan: ServicePlan;
  status: ServingStatus;
  /** Omit to render without the save button (inside the saved image). */
  onSaveImage?: () => void;
}

/** Dark "전역까지 D-n" card: next promotion, per-rank progress, discharge day. */
export default function DdayCard({ plan, status, onSaveImage }: DdayCardProps) {
  const next = status.nextPromotion;
  const today = Date.now();
  return (
    <section
      aria-label="전역 D-day"
      className="flex flex-col gap-2.5 rounded-[20px] bg-foreground px-[18px] pb-3 pt-3.5 text-white"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[#A9AD9F]">전역까지</span>
          <span className="font-mono text-[46px] font-bold leading-[1.05] tracking-[-0.02em]">
            {dLabel(status.daysLeft)}
          </span>
        </div>
        <div className="flex items-center gap-2.5 pt-1">
          {next && (
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[11.5px] text-[#A9AD9F]">
                {next.label.replace(" 진급", "")}까지
              </span>
              <span className="font-mono text-[19px] font-bold">
                {dLabel(next.daysLeft)}
              </span>
            </div>
          )}
          {onSaveImage && (
            <button
              type="button"
              aria-label="D-day 카드 이미지로 저장"
              onClick={onSaveImage}
              className="flex size-11 items-center justify-center rounded-[10px] border border-[#3C4036] text-white hover:bg-white/10"
            >
              <ImageDown className="size-4" strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div
          role="progressbar"
          aria-label="복무 진행률"
          aria-valuenow={status.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="flex h-[7px] gap-[3px]"
        >
          {plan.periods.map((p) => {
            const span = p.end.getTime() - p.start.getTime();
            const done = Math.min(
              1,
              Math.max(0, (today - p.start.getTime()) / (span || 1)),
            );
            return (
              <div
                key={p.rank}
                style={{ flexGrow: p.days }}
                className="relative basis-0 overflow-hidden rounded bg-[#3C4036]"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-[#B8C78F]"
                  style={{ width: `${done * 100}%` }}
                />
              </div>
            );
          })}
        </div>
        <div
          className="flex gap-[3px] text-[10.5px] text-[#8E9384]"
          aria-hidden="true"
        >
          {plan.periods.map((p) => (
            <span
              key={p.rank}
              style={{ flexGrow: p.days }}
              className={cn(
                "min-w-max basis-0",
                p.rank === status.current.rank && "font-bold text-white",
              )}
            >
              {p.rank}
            </span>
          ))}
        </div>
        <span className="mt-0.5 text-xs text-[#E4E6DE]">
          {status.dayOfService.toLocaleString()}일째 복무 중 ·{" "}
          <span className="font-mono font-semibold">
            {status.progress.toFixed(1)}%
          </span>{" "}
          · <span className="font-mono">{fullDot(plan.discharge)}</span> 전역
        </span>
      </div>
    </section>
  );
}
