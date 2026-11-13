import { useMemo, useState } from "react";
import { addYears, startOfDay } from "date-fns";
import { Check } from "lucide-react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import MobileShell from "@/components/ipdae/MobileShell";
import BrandMark from "@/components/ipdae/BrandMark";
import SiteFooter from "@/components/ipdae/SiteFooter";
import BranchPicker from "@/components/ipdae/BranchPicker";
import { loadSavedEnlistment } from "@/hooks/useSavedEnlistment";
import { fullDot } from "@/lib/format";
import {
  type Branch,
  SERVICE_MONTHS,
  computeService,
  isBranch,
  parseDay,
  toDayParam,
} from "@/lib/service";
import { cn } from "@/lib/utils";

const MIN_DAY = "2010-02-01"; // chart data starts Feb 2010
const FUTURE_YEARS = 2; // 입대 예정자: up to two years ahead

type Stage = "pre" | "serving" | "done";

/** What each visitor gets, picked under "나는 지금". */
const STAGES: Record<Stage, { label: string; perks: string[] }> = {
  pre: {
    label: "미필",
    perks: [
      "입대까지 남은 날과 내 전역 예정일",
      "미리보는 내 진급일",
      "군대 선배에게 물어보는 군대 팁",
    ],
  },
  serving: {
    label: "현역",
    perks: [
      "전역까지 D-day와 다음 진급일",
      "지금 계급 시절 차트 노래",
      "선후임과 이야기 나누기",
    ],
  },
  done: {
    label: "전역",
    perks: [
      "이병부터 병장까지 그 시절 차트",
      "내 입대곡 카드로 공유하기",
      "후임들에게 한마디 남기기",
    ],
  },
};
const STAGE_KEYS = Object.keys(STAGES) as Stage[];

/** The stage a prefilled date (입대 정보 수정) belongs to. */
function stageOf(day: Date | null, branch: Branch): Stage {
  const today = startOfDay(new Date());
  if (!day || day > today) return "pre";
  return computeService(day, branch).discharge >= today ? "serving" : "done";
}

export default function Index() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editing = params.get("edit") === "1";
  // returning visitor → their D-day; "입대 정보 수정" (?edit=1) → prefilled form
  const saved = editing ? null : loadSavedEnlistment();
  const [enlist, setEnlist] = useState(() =>
    parseDay(params.get("d")) ? params.get("d")! : "",
  );
  const [branch, setBranch] = useState<Branch>(() => {
    const b = params.get("b");
    return isBranch(b) ? b : "육군";
  });
  const [stage, setStage] = useState<Stage>(() =>
    stageOf(parseDay(params.get("d")), branch),
  );

  // The date is not tied to the stage picked above: any day in range
  const maxDay = toDayParam(addYears(new Date(), FUTURE_YEARS));
  const valid = !!parseDay(enlist) && enlist >= MIN_DAY && enlist <= maxDay;
  const plan = useMemo(
    () => (valid ? computeService(parseDay(enlist)!, branch) : null),
    [valid, enlist, branch],
  );
  const info = STAGES[stage];
  // 공익 (사회복무요원) is 소집, not 입대
  const dateLabel = branch === "공익" ? "소집일" : "입대일";
  const out = branch === "공익" ? "소집해제" : "전역";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    navigate(`/dday?${new URLSearchParams({ d: enlist, b: branch })}`);
  };

  if (saved) return <Navigate to={`/dday?${saved}`} replace />;

  return (
    <MobileShell className="gap-7 px-6 pb-8 pt-14">
      <header className="flex flex-col gap-3">
        <BrandMark />
        <h1 className="text-[32px] font-bold leading-tight tracking-[-0.02em]">
          미필부터 예비군까지
          <br />내 군생활의 모든 것
        </h1>
      </header>

      <section className="flex flex-col gap-3" aria-labelledby="stage-label">
        <span id="stage-label" className="text-sm font-bold">
          나는 지금
        </span>
        <div
          role="radiogroup"
          aria-labelledby="stage-label"
          className="grid w-full max-w-[240px] grid-cols-3 gap-1 rounded-full bg-muted p-1"
        >
          {STAGE_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={stage === key}
              onClick={() => setStage(key)}
              className={cn(
                "h-8 rounded-full text-[13px] font-bold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                stage === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {STAGES[key].label}
            </button>
          ))}
        </div>
        <ul className="flex flex-col gap-2 rounded-[14px] bg-accent px-4 py-3">
          {info.perks.map((perk) => (
            <li
              key={perk}
              className="flex items-start gap-2 text-[14px] leading-snug"
            >
              <Check
                aria-hidden
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                strokeWidth={2.5}
              />
              {perk}
            </li>
          ))}
        </ul>
      </section>

      <form
        id="enlist-form"
        onSubmit={submit}
        className="flex flex-col gap-6 rounded-[20px] border bg-card px-5 py-6"
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <label htmlFor="enlist" className="text-sm font-bold">
              {dateLabel}
            </label>
            <span className="text-xs text-muted-foreground">예정일도 돼요</span>
          </div>
          <input
            id="enlist"
            type="date"
            required
            min={MIN_DAY}
            max={maxDay}
            value={enlist}
            onChange={(e) => setEnlist(e.target.value)}
            className="h-[52px] rounded-xl border border-input bg-field px-3.5 font-mono text-[17px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          {enlist && !valid && (
            <span className="text-[13px] text-destructive" role="alert">
              2010년 2월부터 2년 뒤까지의 날짜를 넣어주세요.
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span id="branch-label" className="text-sm font-bold">
            군 종류
          </span>
          <BranchPicker
            value={branch}
            onChange={setBranch}
            labelId="branch-label"
          />
          <span
            className="text-[13px] text-muted-foreground"
            aria-live="polite"
          >
            {plan
              ? `${branch} ${plan.baseMonths}개월${plan.reductionDays ? ` − ${plan.reductionDays}일 단축` : ""} · ${fullDot(plan.discharge)} ${out}`
              : `${branch} 현재 복무기간 ${SERVICE_MONTHS[branch]}개월 기준`}
          </span>
        </div>

        <p className="rounded-[10px] bg-background px-3 py-2.5 text-[13px] leading-relaxed text-muted-foreground">
          {out}일은 병역법 기준(단계적 단축 포함), 진급일은 당시 진급 기준으로
          계산해요. 실제와 다르면 다음 화면에서 고칠 수 있어요.
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
          {editing ? "저장하고 보기" : "입대일로 시작하기"}
        </button>
        <span className="text-center text-xs text-muted-foreground">
          가입 없이 바로 · 날짜는 이 기기에만 저장돼요
        </span>
        <SiteFooter className="pt-1" />
      </div>
    </MobileShell>
  );
}
