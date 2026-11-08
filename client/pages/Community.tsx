import { useMemo, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Check, ChevronDown, MessagesSquare, Plus } from "lucide-react";
import MobileShell from "@/components/ipdae/MobileShell";
import BottomNav from "@/components/ipdae/BottomNav";
import ComingSoon from "@/components/ipdae/ComingSoon";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useServicePlan } from "@/hooks/useServicePlan";
import { dLabel, ddayStatus } from "@/lib/dday";
import { RANKS } from "@/lib/service";
import { cn } from "@/lib/utils";

const RANK_FILTERS = [...RANKS, "예비역"] as const;
type RankFilter = (typeof RANK_FILTERS)[number];

/**
 * 커뮤니티: posts filtered by rank. The screen and filters work;
 * posts need a backend, so the list shows a "기능 추가 예정" notice for now.
 */
export default function Community() {
  const { plan } = useServicePlan();
  const { search } = useLocation();
  const status = useMemo(() => (plan ? ddayStatus(plan) : null), [plan]);
  const [rank, setRank] = useState<RankFilter | null>(null);
  const [picker, setPicker] = useState(false);

  if (!plan || !status) return <Navigate to="/" replace />;

  const me =
    status.status === "serving"
      ? `${status.current.rank} · ${dLabel(status.daysLeft)}`
      : status.status === "done"
        ? "예비역"
        : "입대 전";
  const note = rank
    ? `${rank}일 때 남긴 글만 보여요.`
    : "모든 계급의 글이 최신순으로 보여요.";

  return (
    <MobileShell>
      <header className="flex flex-col gap-px px-5 pb-2 pt-4">
        <span className="font-mono text-[11px] text-ink-icon">{me}</span>
        <h1 className="text-lg font-bold">커뮤니티</h1>
      </header>

      <div
        className="flex flex-wrap gap-1.5 px-4 pb-2.5 pt-1"
        role="group"
        aria-label="글 필터"
      >
        <Chip on={!rank} onClick={() => setRank(null)}>
          전체
        </Chip>
        <Chip on={!!rank} onClick={() => setPicker(true)} hasMenu>
          {rank ?? "계급"}
        </Chip>
      </div>

      <p className="px-4 pb-2 text-xs leading-normal text-ink-icon">{note}</p>

      <main className="flex flex-1 flex-col px-4 pb-24">
        <section className="flex flex-col items-center gap-2.5 rounded-2xl border bg-card px-6 py-10 text-center">
          <span
            aria-hidden="true"
            className="flex size-14 items-center justify-center rounded-full bg-accent text-primary"
          >
            <MessagesSquare className="size-6" strokeWidth={2} />
          </span>
          <h2 className="text-base font-bold">커뮤니티를 준비하고 있어요</h2>
          <p className="text-[13.5px] leading-relaxed text-muted-foreground">
            같은 시기를 지나는 사람들, 먼저 지나간 선배들의 글을 계급별로 모아
            볼 수 있게 만들고 있어요.
          </p>
          <ComingSoon />
        </section>
      </main>

      <div className="pointer-events-none sticky bottom-[calc(56px+max(env(safe-area-inset-bottom),6px))] z-10 px-4 pb-3">
        <Link
          to={`/leave${search}`}
          className="pointer-events-auto flex h-12 items-center justify-center gap-1.5 rounded-[14px] bg-primary text-[14.5px] font-bold text-primary-foreground shadow-[0_4px_14px_rgba(26,29,22,0.18)]"
        >
          <Plus className="size-4" strokeWidth={2.2} aria-hidden="true" />
          한마디 남기기
        </Link>
      </div>

      <BottomNav />

      <Drawer open={picker} onOpenChange={setPicker}>
        <DrawerContent className="mx-auto max-w-[430px] px-4 pb-8">
          <DrawerTitle className="pt-4 text-base">계급 선택</DrawerTitle>
          <DrawerDescription className="pb-3 text-xs">
            선택한 계급일 때 남긴 글만 보여요.
          </DrawerDescription>
          <ul className="flex flex-col gap-1.5">
            {RANK_FILTERS.map((r) => (
              <PickerRow
                key={r}
                on={rank === r}
                onClick={() => {
                  setRank(rank === r ? null : r);
                  setPicker(false);
                }}
              >
                {r}
              </PickerRow>
            ))}
          </ul>
        </DrawerContent>
      </Drawer>
    </MobileShell>
  );
}

function Chip({
  on,
  onClick,
  hasMenu,
  children,
}: {
  on: boolean;
  onClick: () => void;
  hasMenu?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={hasMenu ? undefined : on}
      aria-haspopup={hasMenu ? "dialog" : undefined}
      className={cn(
        "flex h-[34px] items-center gap-1 whitespace-nowrap rounded-full border px-3.5 text-[12.5px] font-bold",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground",
      )}
    >
      {children}
      {hasMenu && (
        <ChevronDown
          className="size-3.5"
          strokeWidth={2.4}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function PickerRow({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={on}
        className={cn(
          "flex h-12 w-full items-center gap-2.5 rounded-xl border px-3.5 text-left text-[15px] font-bold",
          on ? "border-primary bg-accent" : "border-border bg-card",
        )}
      >
        <span className="flex flex-1 items-center gap-2.5">{children}</span>
        {on && (
          <Check
            className="size-[18px] text-primary"
            strokeWidth={2.4}
            aria-hidden="true"
          />
        )}
      </button>
    </li>
  );
}
