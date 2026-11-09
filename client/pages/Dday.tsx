import { useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import MobileShell from "@/components/ipdae/MobileShell";
import AppHeader from "@/components/ipdae/AppHeader";
import BottomNav from "@/components/ipdae/BottomNav";
import DdayCard from "@/components/ipdae/DdayCard";
import TalkLinkCard from "@/components/ipdae/TalkLinkCard";
import MilestoneList from "@/components/ipdae/MilestoneList";
import SongsShortcut from "@/components/ipdae/SongsShortcut";
import DoneCard from "@/components/ipdae/DoneCard";
import NotYetCard from "@/components/ipdae/NotYetCard";
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
            <TalkLinkCard reserve={false} />
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
            <TalkLinkCard reserve />
            <MilestoneList
              title="다가오는 기념일"
              items={status.anniversaries}
            />
            <RankTopSongs plan={plan} listenAll />
          </>
        )}

        {status.status === "notYet" && (
          <>
            <NotYetCard
              plan={plan}
              status={status}
              onSaveImage={() => setSnapshot(true)}
            />
            <MilestoneList
              title="입대 후 일정"
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
            <p className="rounded-2xl border bg-card px-4 py-3.5 text-[13px] leading-relaxed text-muted-foreground">
              입대하면 계급마다 그 시절 차트가 쌓이고, 커뮤니티에서 예비역
              선배들과 이야기할 수 있어요.
            </p>
          </>
        )}
      </main>

      <BottomNav />
      {snapshot && (
        <CardSnapshot
          fileName={
            status.status === "serving"
              ? `ipdaegok-${dLabel(status.daysLeft)}.png`
              : status.status === "done"
                ? `ipdaegok-D+${status.daysSince}.png`
                : `ipdaegok-입대${dLabel(status.daysLeft)}.png`
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
          ) : status.status === "done" ? (
            <DoneCard plan={plan} status={status} />
          ) : (
            <NotYetCard plan={plan} status={status} />
          )}
          {status.status !== "notYet" && <RankTopSongs plan={plan} />}
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
