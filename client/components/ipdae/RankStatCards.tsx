import type { ServingStatus } from "@/lib/dday";
import { dLabel } from "@/lib/dday";
import { fullDot } from "@/lib/format";

/** 현재 계급 + 다음 진급(병장이면 전역) cards. */
export default function RankStatCards({ status }: { status: ServingStatus }) {
  const next = status.nextPromotion;
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <StatCard label="현재 계급">
        <span className="text-[22px] font-bold">{status.current.rank}</span>
        <span className="text-xs text-muted-foreground">진급 {status.dayOfRank}일째</span>
      </StatCard>
      <StatCard label={next ? `${next.label.replace(" 진급", "")}까지` : "전역까지"}>
        <span className="font-mono text-[22px] font-bold">
          {dLabel(next ? next.daysLeft : status.daysLeft)}
        </span>
        <span className="font-mono text-xs text-muted-foreground">
          {next ? fullDot(next.date) : "마지막 계급"}
        </span>
      </StatCard>
    </div>
  );
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border bg-card p-3.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
