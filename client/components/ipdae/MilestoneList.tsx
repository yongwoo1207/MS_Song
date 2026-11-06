import type { Milestone } from "@/lib/dday";
import { dLabel } from "@/lib/dday";
import { fullDot } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MilestoneListProps {
  title: string;
  items: Milestone[];
  action?: React.ReactNode;
  /** Label to emphasise (e.g. 전역) */
  strong?: string;
}

/** "다가오는 날" card: label · date · D-n badge; the nearest one highlighted. */
export default function MilestoneList({ title, items, action, strong }: MilestoneListProps) {
  return (
    <section className="flex flex-col rounded-2xl border bg-card px-3.5 pb-1 pt-1.5">
      <div className="flex items-center justify-between pb-1 pt-2">
        <h2 className="text-sm font-bold">{title}</h2>
        {action}
      </div>
      <ul>
        {items.map((m, i) => (
          <li key={m.label} className="flex h-11 items-center gap-2.5 border-t border-muted">
            <span className={cn("min-w-0 flex-1 truncate text-sm", m.label === strong && "font-bold")}>
              {m.label}
            </span>
            <span className="font-mono text-xs text-muted-foreground">{fullDot(m.date)}</span>
            <span
              className={cn(
                "w-[62px] rounded-md py-[3px] text-center font-mono text-xs font-bold",
                i === 0 ? "bg-accent text-primary" : "bg-muted text-foreground",
              )}
            >
              {dLabel(m.daysLeft)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
