import { useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import MobileShell from "@/components/ipdae/MobileShell";
import AppHeader from "@/components/ipdae/AppHeader";
import BottomNav from "@/components/ipdae/BottomNav";
import DdayCard from "@/components/ipdae/DdayCard";
import SeniorsCard from "@/components/ipdae/SeniorsCard";
import LeaveCta from "@/components/ipdae/LeaveCta";
import MilestoneList from "@/components/ipdae/MilestoneList";
import SongsShortcut from "@/components/ipdae/SongsShortcut";
import DoneCard from "@/components/ipdae/DoneCard";
import RankTopSongs from "@/components/ipdae/RankTopSongs";
import EditDatesDrawer from "@/components/ipdae/EditDatesDrawer";
import CardSnapshot from "@/components/ipdae/CardSnapshot";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useServicePlan } from "@/hooks/useServicePlan";
import { useChartDB } from "@/hooks/useRankChart";
import { useSaveEnlistment } from "@/hooks/useSavedEnlistment";
import { dLabel, ddayStatus } from "@/lib/dday";
import { dayWithWeekday, fullDot } from "@/lib/format";

export default function Dday() {
  const { plan, setOverrides } = useServicePlan();
  const { search } = useLocation();
  const [editing, setEditing] = useState(false);
  const [snapshot, setSnapshot] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const chartDB = useChartDB(); // the saved image lists each rank's #1 song
  useSaveEnlistment(search, !!plan);
  const status = useMemo(() => (plan ? ddayStatus(plan) : null), [plan]);

  if (!plan || !status) return <Navigate to="/" replace />;

  const pageUrl = `${window.location.origin}/dday${search}`;

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
              onSaveImage={() => setSnapshot(true)}
            />
            <SeniorsCard daysLeft={status.daysLeft} />
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
              onSaveImage={() => setSnapshot(true)}
            />
            <LeaveCta />
            <MilestoneList
              title="다가오는 기념일"
              items={status.anniversaries}
            />
            <RankTopSongs plan={plan} listenAll />
          </>
        )}

        {status.status === "notYet" && (
          <p className="rounded-2xl border bg-card p-5 text-sm leading-relaxed text-muted-foreground">
            {fullDot(plan.enlist)} 입대 예정이에요. 전역 예정일은{" "}
            {dayWithWeekday(plan.discharge)}
            입니다.
          </p>
        )}
      </main>

      <BottomNav />
      {snapshot && status.status !== "notYet" && (
        <CardSnapshot
          fileName={
            status.status === "serving"
              ? `ipdaegok-${dLabel(status.daysLeft)}.png`
              : `ipdaegok-D+${status.daysSince}.png`
          }
          title="입대곡"
          text={pageUrl}
          ready={!!chartDB.data}
          onDone={({ previewUrl }) => {
            setSnapshot(false);
            setPreviewUrl(previewUrl);
          }}
        >
          {status.status === "serving" ? (
            <DdayCard plan={plan} status={status} />
          ) : (
            <DoneCard plan={plan} status={status} />
          )}
          <RankTopSongs plan={plan} />
        </CardSnapshot>
      )}
      <Drawer
        open={!!previewUrl}
        onOpenChange={(open) => {
          if (open) return;
          if (previewUrl) URL.revokeObjectURL(previewUrl);
          setPreviewUrl(undefined);
        }}
      >
        <DrawerContent className="mx-auto max-w-[430px] px-4 pb-8">
          <DrawerTitle className="pt-4 text-center text-base">
            이미지를 길게 눌러 저장하세요
          </DrawerTitle>
          <DrawerDescription className="pb-3 text-center text-xs">
            사진 앱에 저장하거나 바로 공유할 수 있어요.
          </DrawerDescription>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="D-day 카드 이미지"
              className="w-full rounded-2xl border"
            />
          )}
        </DrawerContent>
      </Drawer>
      <EditDatesDrawer
        plan={plan}
        open={editing}
        onOpenChange={setEditing}
        onSave={setOverrides}
      />
    </MobileShell>
  );
}
