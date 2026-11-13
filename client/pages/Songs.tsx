import { useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import MobileShell from "@/components/ipdae/MobileShell";
import SubHeader from "@/components/ipdae/SubHeader";
import BranchPicker from "@/components/ipdae/BranchPicker";
import RankTabs from "@/components/ipdae/RankTabs";
import RankChartPanel from "@/components/ipdae/RankChartPanel";
import NowPlaying from "@/components/ipdae/NowPlaying";
import { useServicePlan } from "@/hooks/useServicePlan";
import { usePlayer } from "@/hooks/usePlayer";
import { useSwipe } from "@/hooks/useSwipe";
import {
  CHART_MIN_DAY,
  browsedPlan,
  inEnlistRange,
  maxEnlistDay,
  parseBrowsed,
  shiftYears,
  withBrowsed,
} from "@/lib/browse";
import { fullDot } from "@/lib/format";
import { writerOf } from "@/lib/memories";
import { RANKS, type Branch, type Rank, rankOn } from "@/lib/service";
import { cn } from "@/lib/utils";

/** Quick picks next to the date field, as years from my own 입대일. */
const SHIFTS = [
  { years: -1, label: "1년 선배" },
  { years: 0, label: "내 입대일" },
  { years: 1, label: "1년 후임" },
];

/**
 * 다른 입대일 노래: the per-rank charts of any enlistment day, not just
 * mine — every song plays and can be hearted from here. The browsed day
 * is in the address (od / ob), so it can be shared, and my own 입대일
 * stays as it is.
 */
export default function Songs() {
  const { plan } = useServicePlan(); // mine: a heart shows my 군번
  const [params, setParams] = useSearchParams();
  const player = usePlayer();
  const browsed = useMemo(() => parseBrowsed(params), [params]);
  const other = useMemo(
    () => (browsed ? browsedPlan(browsed) : null),
    [browsed],
  );

  // Form state, prefilled with whatever is being browsed
  const [day, setDay] = useState(() => browsed?.day ?? "");
  const [branch, setBranch] = useState<Branch>(
    () => browsed?.branch ?? plan?.branch ?? "육군",
  );
  const [tab, setTab] = useState<Rank>("이병");
  const swipe = useSwipe((dir) => {
    const next = RANKS[RANKS.indexOf(tab) + dir];
    if (!next) return;
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  if (!plan) return <Navigate to="/" replace />;

  const valid = inEnlistRange(day);
  const show = (d: string, b: Branch = branch) => {
    setDay(d);
    setBranch(b);
    setParams(withBrowsed(params, { day: d, branch: b }), { replace: true });
    setTab("이병");
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (valid) show(day);
  };
  // Where the browsed soldier stands today, so the chart line reads right
  const rankToday = other ? rankOn(other, new Date()) : null;

  return (
    <MobileShell>
      <SubHeader title="다른 입대일 노래" />
      <NowPlaying player={player} author={writerOf(plan)} />

      <form
        onSubmit={submit}
        className="flex flex-col gap-2.5 border-b px-4 pb-4 pt-1"
      >
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          입대일만 넣으면 그 시절 계급별 차트를 그대로 볼 수 있어요. 노래
          좋아요도 그대로 눌러져요. 내 입대일은 바뀌지 않아요.
        </p>
        <div className="flex gap-2">
          <input
            aria-label="보고 싶은 입대일"
            type="date"
            required
            min={CHART_MIN_DAY}
            max={maxEnlistDay()}
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="h-12 min-w-0 flex-1 rounded-xl border border-input bg-field px-3 font-mono text-[15px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <button
            type="submit"
            disabled={!valid}
            className="h-12 shrink-0 rounded-xl bg-primary px-4 text-[15px] font-bold text-primary-foreground disabled:opacity-50"
          >
            보기
          </button>
        </div>
        <BranchPicker value={branch} onChange={setBranch} labelId="ob-label" />
        <span id="ob-label" className="sr-only">
          군 종류
        </span>
        {day && !valid && (
          <span className="text-[13px] text-destructive" role="alert">
            2010년 2월부터 2년 뒤까지의 날짜를 넣어주세요.
          </span>
        )}
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="빠른 선택"
        >
          {SHIFTS.map(({ years, label }) => {
            const to = shiftYears(plan.enlist, years);
            if (!to) return null;
            return (
              <button
                key={label}
                type="button"
                onClick={() => show(to, plan.branch)}
                className={cn(
                  "h-[34px] rounded-full border px-3.5 text-[12.5px] font-bold",
                  to === browsed?.day && plan.branch === browsed?.branch
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </form>

      {!other ? (
        <p className="px-6 py-16 text-center text-sm leading-relaxed text-muted-foreground">
          보고 싶은 입대일을 넣어주세요.
          <br />
          선배·후임의 입대곡도 들어볼 수 있어요.
        </p>
      ) : (
        <main className="flex flex-1 flex-col pb-10">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 px-4 pt-3">
            <span className="font-mono text-[13px] font-bold">
              {fullDot(other.enlist)} {other.branch} 입대
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {fullDot(other.discharge)} 전역
              {rankToday ? ` · 오늘 ${rankToday}` : ""}
            </span>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as Rank)}>
            <RankTabs />
            <div {...swipe} className="min-h-[50vh] touch-pan-y">
              {other.periods.map((period) => (
                <TabsContent
                  key={period.rank}
                  value={period.rank}
                  className="mt-0"
                >
                  <RankChartPanel
                    period={period}
                    player={player}
                    author={writerOf(plan)}
                    current={period.rank === rankToday}
                  />
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </main>
      )}
    </MobileShell>
  );
}
