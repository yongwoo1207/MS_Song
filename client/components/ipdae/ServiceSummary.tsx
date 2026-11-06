import type { ServicePlan } from "@/lib/service";
import { fullDot, relDot } from "@/lib/format";
import { cn } from "@/lib/utils";

const SHADES = ["bg-rank-1", "bg-rank-2", "bg-rank-3", "bg-rank-4"];

/** Discharge date + proportional rank timeline. */
export default function ServiceSummary({
  plan,
  onEditDates,
}: {
  plan: ServicePlan;
  onEditDates?: () => void;
}) {
  const year = plan.enlist.getFullYear();
  return (
    <section
      aria-label="복무 기간"
      className="mx-4 mt-2 flex flex-col gap-2.5 rounded-2xl border bg-card px-4 py-3.5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 flex-wrap gap-x-1 text-[13px] text-muted-foreground">
          <span className="whitespace-nowrap">
            전역 · {plan.serviceDays.toLocaleString()}일 복무
          </span>
          {plan.reductionDays > 0 && (
            <span className="whitespace-nowrap">({plan.reductionDays}일 단축)</span>
          )}
        </span>
        <span className="shrink-0 font-mono text-[15px] font-semibold">
          {fullDot(plan.discharge)}
        </span>
      </div>
      <div className="flex h-2 gap-[3px]" aria-hidden="true">
        {plan.periods.map((p, i) => (
          <div
            key={p.rank}
            style={{ flexGrow: p.days }}
            className={cn("basis-0", SHADES[i], i === 0 && "rounded-l", i === 3 && "rounded-r")}
          />
        ))}
      </div>
      <ol className="flex gap-[3px] font-mono text-[11px] text-muted-foreground">
        {plan.periods.map((p) => (
          <li key={p.rank} style={{ flexGrow: p.days }} className="min-w-max basis-0 whitespace-nowrap pr-1">
            <span className="sr-only">{p.rank} </span>
            {relDot(p.start, year)}
          </li>
        ))}
      </ol>
      {onEditDates && (
        <button
          type="button"
          onClick={onEditDates}
          className="-mb-1 self-end text-xs font-bold text-primary hover:underline"
        >
          진급일이 다르면 수정
        </button>
      )}
    </section>
  );
}
