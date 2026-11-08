import { useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import MobileShell from "@/components/ipdae/MobileShell";
import AppHeader from "@/components/ipdae/AppHeader";
import BottomNav from "@/components/ipdae/BottomNav";
import ServiceSummary from "@/components/ipdae/ServiceSummary";
import RankTabs from "@/components/ipdae/RankTabs";
import RankChartPanel from "@/components/ipdae/RankChartPanel";
import LockedRank from "@/components/ipdae/LockedRank";
import NowPlaying from "@/components/ipdae/NowPlaying";
import EditDatesDrawer from "@/components/ipdae/EditDatesDrawer";
import { useServicePlan } from "@/hooks/useServicePlan";
import { useSaveEnlistment } from "@/hooks/useSavedEnlistment";
import { usePlayer } from "@/hooks/usePlayer";
import { cohortMonthOf } from "@/lib/memories";
import { ddayStatus, isLockedRank } from "@/lib/dday";
import { RANKS, type Rank, rankOn } from "@/lib/service";

/** 입대곡 tab: per-rank charts; ranks not reached yet stay locked. */
export default function Result() {
  const { plan, setOverrides } = useServicePlan();
  const { search } = useLocation();
  const player = usePlayer();
  useSaveEnlistment(search, !!plan);
  const current = useMemo(
    () => (plan ? rankOn(plan, new Date()) : null),
    [plan],
  );
  const locked = useMemo(
    () => (plan ? RANKS.filter((r) => isLockedRank(plan, r)) : []),
    [plan],
  );
  const [tab, setTab] = useState<Rank>(() => current ?? "이병");
  const [editing, setEditing] = useState(false);

  if (!plan) return <Navigate to="/" replace />;

  return (
    <MobileShell>
      <AppHeader plan={plan} title="내 입대곡" />
      <NowPlaying
        player={player}
        author={{
          cohortMonth: cohortMonthOf(plan.enlist),
          branch: plan.branch,
          isReserve: ddayStatus(plan).status === "done",
        }}
      />

      <ServiceSummary plan={plan} onEditDates={() => setEditing(true)} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Rank)}>
        <RankTabs locked={locked} />
        {plan.periods.map((period) => (
          <TabsContent key={period.rank} value={period.rank} className="mt-0">
            {locked.includes(period.rank) ? (
              <LockedRank period={period} />
            ) : (
              <RankChartPanel
                period={period}
                player={player}
                current={period.rank === current}
              />
            )}
          </TabsContent>
        ))}
      </Tabs>

      <BottomNav />
      <EditDatesDrawer
        plan={plan}
        open={editing}
        onOpenChange={setEditing}
        onSave={setOverrides}
      />
    </MobileShell>
  );
}
