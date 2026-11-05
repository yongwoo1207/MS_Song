import type { ServicePlan } from "@/lib/service";
import { fullDot, relDot } from "@/lib/format";
import { cn } from "@/lib/utils";

const SHADES = ["bg-rank-1", "bg-rank-2", "bg-rank-3", "bg-rank-4"];

/** Discharge date + proportional rank timeline. */
export default function ServiceSummary({ plan }: { plan: ServicePlan }) {
  const year = plan.enlist.getFullYear();
  return (
    <section
      aria-label="복무 기간"
      className="mx-4 flex flex-col gap-2.5 rounded-2xl border bg-card px-4 py-3.5"
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-muted-foreground">전역</span>
        <span className="font-mono text-[15px] font-semibold">{fullDot(plan.discharge)}</span>
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
    </section>
  );
}
