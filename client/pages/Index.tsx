import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MobileShell from "@/components/ipdae/MobileShell";
import BrandMark from "@/components/ipdae/BrandMark";
import BranchSegment from "@/components/ipdae/BranchSegment";
import { type Branch, SERVICE_MONTHS, parseDay, toDayParam } from "@/lib/service";
import { cn } from "@/lib/utils";

const MIN_DAY = "2010-02-01"; // chart data starts Feb 2010

export default function Index() {
  const navigate = useNavigate();
  const [enlist, setEnlist] = useState("");
  const [branch, setBranch] = useState<Branch>("육군");
  const today = toDayParam(new Date());
  const valid = !!parseDay(enlist) && enlist >= MIN_DAY && enlist <= today;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    navigate(`/result?${new URLSearchParams({ d: enlist, b: branch })}`);
  };

  return (
    <MobileShell className="gap-8 px-6 pb-8 pt-14">
      <header className="flex flex-col gap-3">
        <BrandMark />
        <h1 className="text-[34px] font-bold leading-tight tracking-[-0.02em]">
          그때 그 노래,
          <br />
          계급별로 다시 듣기
        </h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          입대일만 넣으면 이등병부터 병장까지 그 시절 차트를 꺼내드려요.
        </p>
      </header>

      <form id="enlist-form" onSubmit={submit} className="flex flex-col gap-6 rounded-[20px] border bg-card px-5 py-6">
        <div className="flex flex-col gap-2">
          <label htmlFor="enlist" className="text-sm font-bold">
            입대일
          </label>
          <input
            id="enlist"
            type="date"
            required
            min={MIN_DAY}
            max={today}
            value={enlist}
            onChange={(e) => setEnlist(e.target.value)}
            className="h-[52px] rounded-xl border border-input bg-field px-3.5 font-mono text-[17px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
        </div>

        <div className="flex flex-col gap-2">
          <span id="branch-label" className="text-sm font-bold">
            군 종류
          </span>
          <BranchSegment value={branch} onChange={setBranch} labelId="branch-label" />
          <span className="text-[13px] text-muted-foreground">
            {branch} 현재 복무기간 {SERVICE_MONTHS[branch]}개월 기준
          </span>
        </div>

        <p className="rounded-[10px] bg-background px-3 py-2.5 text-[13px] leading-relaxed text-muted-foreground">
          전역일·진급일은 통상 기준으로 자동 계산돼요. 실제와 다르면 다음 화면에서 고칠 수 있어요.
        </p>
      </form>

      <div className="flex-1" />

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          form="enlist-form"
          disabled={!valid}
          className={cn(
            "flex h-14 items-center justify-center rounded-[14px] bg-primary text-[17px] font-bold text-primary-foreground transition-opacity",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
          )}
        >
          내 입대곡 보기
        </button>
        <span className="text-center text-xs text-muted-foreground">
          써클차트 디지털차트 기준 · 2010년 2월 이후 입대자
        </span>
      </div>
    </MobileShell>
  );
}
