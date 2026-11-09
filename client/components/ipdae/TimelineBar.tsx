import { useRef } from "react";
import { addDays, addMonths, differenceInCalendarDays } from "date-fns";
import type { ServicePlan } from "@/lib/service";
import type { ServiceMonth } from "@/lib/timeline";
import { cn } from "@/lib/utils";

/** Light to dark, 이병 → 병장 */
const RANK_SHADES = ["#C5D1A6", "#A8B885", "#7C8E52", "#4A5A2A"];

/** 'YYYY-MM' → that month's first day */
const monthStart = (param: string) => {
  const [y, m] = param.split("-").map(Number);
  return new Date(y, m - 1, 1);
};

/**
 * The whole service as one bar (이병 → 병장, sized by days), pinned above
 * the timeline. A cursor marks the month being read, dots mark months with
 * major issues, and dragging or tapping the bar scrolls the list there.
 */
export default function TimelineBar({
  plan,
  months,
  active,
  eventMonths,
  onSeek,
}: {
  plan: ServicePlan;
  months: ServiceMonth[];
  /** Index into months of the chapter on screen */
  active: number;
  /** 'YYYY-MM' of months that have major issues */
  eventMonths: Set<string>;
  /** Jump to a chapter; smooth for taps and keys, instant while dragging */
  onSeek: (index: number, smooth: boolean) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const total = Math.max(1, plan.serviceDays - 1);
  const frac = (d: Date) =>
    Math.min(1, Math.max(0, differenceInCalendarDays(d, plan.enlist) / total));
  // Where each month sits: its middle, kept inside the service
  const at = months.map((m) => {
    const start = monthStart(m.param);
    const from = start < plan.enlist ? plan.enlist : start;
    const end = addDays(addMonths(start, 1), -1);
    const to = end > plan.discharge ? plan.discharge : end;
    return {
      from: frac(from),
      mid: frac(new Date((from.getTime() + to.getTime()) / 2)),
    };
  });
  const today = frac(new Date());
  const current = months[active];
  const activeRank = current?.rank;

  const indexAt = (clientX: number) => {
    const box = track.current!.getBoundingClientRect();
    const f = (clientX - box.left) / box.width;
    let i = 0;
    while (i + 1 < at.length && at[i + 1].from <= f) i++;
    return i;
  };
  const onKey = (e: React.KeyboardEvent) => {
    const next =
      e.key === "ArrowRight" || e.key === "ArrowUp"
        ? active + 1
        : e.key === "ArrowLeft" || e.key === "ArrowDown"
          ? active - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? months.length - 1
              : null;
    if (next === null) return;
    e.preventDefault();
    onSeek(Math.min(months.length - 1, Math.max(0, next)), true);
  };

  if (months.length === 0) return null;

  return (
    <div className="mx-4 mb-1.5 mt-1 flex flex-col gap-1.5 rounded-2xl border bg-card px-3.5 pb-2 pt-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold">{current?.label}</span>
        <span className="font-mono text-[11px] text-ink-icon">
          {current && `${current.rank} ${current.hobong}호봉`}
        </span>
      </div>
      <div
        ref={track}
        role="slider"
        tabIndex={0}
        aria-label="타임라인 위치"
        aria-valuemin={0}
        aria-valuemax={months.length - 1}
        aria-valuenow={active}
        aria-valuetext={
          current
            ? `${current.label}, ${current.rank} ${current.hobong}호봉`
            : ""
        }
        onKeyDown={onKey}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          onSeek(indexAt(e.clientX), false);
        }}
        onPointerMove={(e) => {
          if (dragging.current) onSeek(indexAt(e.clientX), false);
        }}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        className="relative h-7 cursor-pointer touch-none rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="absolute inset-x-0 top-[9px] flex h-[9px] gap-[3px]">
          {plan.periods.map((p, i) => (
            <div
              key={p.rank}
              style={{ flexGrow: p.days, background: RANK_SHADES[i] }}
              className="basis-0 rounded-[5px]"
            />
          ))}
        </div>
        {today < 1 && (
          // Still serving: the months ahead are faded
          <div
            aria-hidden="true"
            style={{ left: `${today * 100}%` }}
            className="absolute right-0 top-[9px] h-[9px] rounded-r-[5px] bg-card/60"
          />
        )}
        {months.map((m, i) =>
          eventMonths.has(m.param) ? (
            <span
              key={m.param}
              aria-hidden="true"
              style={{ left: `${at[i].mid * 100}%` }}
              className="absolute top-[9px] size-[9px] -translate-x-1/2 rounded-full border-2 border-card bg-foreground"
            />
          ) : null,
        )}
        <span
          aria-hidden="true"
          style={{ left: `${(at[active]?.mid ?? 0) * 100}%` }}
          className="absolute top-0 h-7 w-[3px] -translate-x-1/2 rounded-full bg-foreground transition-[left] duration-150"
        />
      </div>
      <div
        className="flex gap-[3px] text-[10.5px] text-ink-icon"
        aria-hidden="true"
      >
        {plan.periods.map((p) => (
          <span
            key={p.rank}
            style={{ flexGrow: p.days }}
            className={cn(
              "min-w-max basis-0",
              p.rank === activeRank && "font-bold text-foreground",
            )}
          >
            {p.rank}
          </span>
        ))}
      </div>
      <span className="text-[11px] text-ink-icon">
        {eventMonths.size > 0 && "검은 점은 주요 이슈가 있던 달 · "}띠를 밀면
        아래가 따라 움직여요
      </span>
    </div>
  );
}
