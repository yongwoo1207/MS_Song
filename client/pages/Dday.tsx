import { useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import MobileShell from "@/components/ipdae/MobileShell";
import AppHeader from "@/components/ipdae/AppHeader";
import BottomNav from "@/components/ipdae/BottomNav";
import DdayCard from "@/components/ipdae/DdayCard";
import RankStatCards from "@/components/ipdae/RankStatCards";
import MilestoneList from "@/components/ipdae/MilestoneList";
import SongsShortcut from "@/components/ipdae/SongsShortcut";
import DoneCard from "@/components/ipdae/DoneCard";
import RankTopSongs from "@/components/ipdae/RankTopSongs";
import EditDatesDrawer from "@/components/ipdae/EditDatesDrawer";
import { useServicePlan } from "@/hooks/useServicePlan";
import { useSaveEnlistment } from "@/hooks/useSavedEnlistment";
import { dLabel, ddayStatus } from "@/lib/dday";
import { dayWithWeekday, fullDot } from "@/lib/format";
import { shareOrCopy } from "@/lib/share";

export default function Dday() {
  const { plan, setOverrides } = useServicePlan();
  const { search } = useLocation();
  const [editing, setEditing] = useState(false);
  useSaveEnlistment(search, !!plan);
  const status = useMemo(() => (plan ? ddayStatus(plan) : null), [plan]);

  if (!plan || !status) return <Navigate to="/" replace />;

  const pageUrl = `${window.location.origin}/dday${search}`;
  const siteUrl = window.location.origin;

  const title =
    status.status === "serving"
      ? `${status.current.rank} · ${status.dayOfService.toLocaleString()}일째`
      : status.status === "done"
        ? "예비역 · 전역 완료"
        : `입대까지 ${dLabel(status.daysLeft)}`;

  return (
    <MobileShell>
      <AppHeader plan={plan} title={title} />

      <main className="flex flex-col gap-3 px-4 pb-4 pt-2">
        {status.status === "serving" && (
          <>
            <DdayCard
              plan={plan}
              status={status}
              onShare={() =>
                shareOrCopy({
                  title: "입대곡 · 전역 D-day",
                  text: `전역까지 ${dLabel(status.daysLeft)} · ${dayWithWeekday(plan.discharge)} 전역`,
                  url: pageUrl,
                })
              }
            />
            <RankStatCards status={status} />
            <MilestoneList
              title="다가오는 날"
              items={status.upcoming}
              strong="전역"
              action={
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="h-8 text-xs font-bold text-primary hover:underline"
                >
                  진급일이 다르면 수정
                </button>
              }
            />
            <SongsShortcut rank={status.current.rank} />
          </>
        )}

        {status.status === "done" && (
          <>
            <DoneCard
              plan={plan}
              status={status}
              onShare={() =>
                shareOrCopy({
                  title: "입대곡 · 전역",
                  text: `전역한 지 D+${status.daysSince} · ${fullDot(plan.discharge)} 전역, 총 ${plan.serviceDays}일 복무`,
                  url: pageUrl,
                })
              }
            />
            <MilestoneList title="다가오는 기념일" items={status.anniversaries} />
            <RankTopSongs plan={plan} />
            <button
              type="button"
              onClick={() =>
                shareOrCopy({
                  title: "입대곡 · 전역 D-day",
                  text: "입대일만 넣으면 전역 D-day랑 계급별 그 시절 노래를 보여줘요",
                  url: siteUrl,
                })
              }
              className="h-12 rounded-[14px] bg-primary text-[15px] font-bold text-primary-foreground"
            >
              아는 현역에게 D-day 보내주기
            </button>
          </>
        )}

        {status.status === "notYet" && (
          <p className="rounded-2xl border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
            {fullDot(plan.enlist)} 입대 예정이에요. 전역 예정일은 {dayWithWeekday(plan.discharge)}
            입니다.
          </p>
        )}
      </main>

      <BottomNav />
      <EditDatesDrawer plan={plan} open={editing} onOpenChange={setEditing} onSave={setOverrides} />
    </MobileShell>
  );
}
