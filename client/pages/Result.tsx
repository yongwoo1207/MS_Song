import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ChevronLeft, Pencil } from "lucide-react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import MobileShell from "@/components/ipdae/MobileShell";
import ServiceSummary from "@/components/ipdae/ServiceSummary";
import RankTabs from "@/components/ipdae/RankTabs";
import RankChartPanel from "@/components/ipdae/RankChartPanel";
import MiniPlayer from "@/components/ipdae/MiniPlayer";
import PlayerSheet from "@/components/ipdae/PlayerSheet";
import EditDatesDrawer from "@/components/ipdae/EditDatesDrawer";
import { useServicePlan } from "@/hooks/useServicePlan";
import { usePlayer } from "@/hooks/usePlayer";
import { fullDot } from "@/lib/format";
import { type Rank, rankOn } from "@/lib/service";

export default function Result() {
  const { plan, setOverrides } = useServicePlan();
  const player = usePlayer();
  const [tab, setTab] = useState<Rank>(() => (plan && rankOn(plan, new Date())) || "이병");
  const [editing, setEditing] = useState(false);

  if (!plan) return <Navigate to="/" replace />;
  const queuedPeriod = plan.periods.find((p) => p.rank === player.queue?.rank);

  return (
    <MobileShell>
      <header className="flex items-center justify-between px-3 pb-2 pt-4">
        <Link
          to="/"
          aria-label="입력 화면으로"
          className="flex size-11 items-center justify-center text-foreground"
        >
          <ChevronLeft className="size-[22px]" strokeWidth={2} />
        </Link>
        <h1 className="text-base font-bold">
          {fullDot(plan.enlist)} {plan.branch} 입대
        </h1>
        <button
          type="button"
          aria-label="날짜 수정"
          onClick={() => setEditing(true)}
          className="flex size-11 items-center justify-center text-foreground"
        >
          <Pencil className="size-5" strokeWidth={2} />
        </button>
      </header>

      <ServiceSummary plan={plan} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Rank)}>
        <RankTabs />
        {plan.periods.map((period) => (
          <TabsContent key={period.rank} value={period.rank} className="mt-0">
            <RankChartPanel period={period} player={player} />
          </TabsContent>
        ))}
      </Tabs>

      {!player.expanded && <MiniPlayer player={player} />}
      <PlayerSheet player={player} period={queuedPeriod} />
      <EditDatesDrawer
        plan={plan}
        open={editing}
        onOpenChange={setEditing}
        onSave={setOverrides}
      />
    </MobileShell>
  );
}
