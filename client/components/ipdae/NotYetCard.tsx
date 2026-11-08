import { ImageDown } from "lucide-react";
import { type NotYetStatus, dLabel } from "@/lib/dday";
import { dayWithWeekday, fullDot } from "@/lib/format";
import type { ServicePlan } from "@/lib/service";

/** Dark "입대까지 D-n" card for 입대 예정자: the whole service still ahead. */
export default function NotYetCard({
  plan,
  status,
  onSaveImage,
}: {
  plan: ServicePlan;
  status: NotYetStatus;
  /** Omit to render without the save button (inside the saved image). */
  onSaveImage?: () => void;
}) {
  return (
    <section
      aria-label="입대 D-day"
      className="flex flex-col gap-2.5 rounded-[20px] bg-foreground px-[18px] pb-3 pt-3.5 text-white"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[#A9AD9F]">입대까지</span>
          <span className="font-mono text-[46px] font-bold leading-[1.05] tracking-[-0.02em]">
            {dLabel(status.daysLeft)}
          </span>
        </div>
        <div className="flex items-center gap-2.5 pt-1">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[11.5px] text-[#A9AD9F]">전역까지</span>
            <span className="font-mono text-[19px] font-bold">
              {dLabel(status.dischargeDaysLeft)}
            </span>
          </div>
          {onSaveImage && (
            <button
              type="button"
              aria-label="입대 D-day 카드 이미지로 저장"
              onClick={onSaveImage}
              className="flex size-11 items-center justify-center rounded-[10px] border border-[#3C4036] text-white hover:bg-white/10"
            >
              <ImageDown className="size-4" strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex h-[7px] gap-[3px]" aria-hidden="true">
          {plan.periods.map((p) => (
            <div
              key={p.rank}
              style={{ flexGrow: p.days }}
              className="basis-0 rounded bg-[#3C4036]"
            />
          ))}
        </div>
        <div
          className="flex gap-[3px] text-[10.5px] text-[#8E9384]"
          aria-hidden="true"
        >
          {plan.periods.map((p) => (
            <span
              key={p.rank}
              style={{ flexGrow: p.days }}
              className="min-w-max basis-0"
            >
              {p.rank}
            </span>
          ))}
        </div>
        <span className="mt-0.5 text-xs text-[#E4E6DE]">
          <span className="font-mono">{dayWithWeekday(plan.enlist)}</span>{" "}
          {plan.branch} 입대 · {plan.baseMonths}개월 ·{" "}
          <span className="font-mono">{fullDot(plan.discharge)}</span> 전역 예정
        </span>
      </div>
    </section>
  );
}
