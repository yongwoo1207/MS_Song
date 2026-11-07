import { useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import MobileShell from "@/components/ipdae/MobileShell";
import BrandMark from "@/components/ipdae/BrandMark";
import BranchSegment from "@/components/ipdae/BranchSegment";
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
import { COUNTRIES, HOME_COUNTRY } from "@/lib/country";
import { Check, Globe } from "lucide-react";
import { toast } from "sonner";

/** 복무 국가: only Korea works for now; the rest is a waitlist. */
function CountryPicker({
  korea,
  onChange,
}: {
  korea: boolean;
  onChange: (korea: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span id="country-label" className="text-sm font-bold">
        복무 국가
      </span>
      <div
        role="radiogroup"
        aria-labelledby="country-label"
        className="flex flex-col gap-1.5"
      >
        <button
          type="button"
          role="radio"
          aria-checked={korea}
          onClick={() => onChange(true)}
          className={cn(
            "flex h-[52px] items-center gap-2.5 rounded-xl border px-3.5 text-left",
            korea ? "border-primary bg-accent" : "border-border bg-card",
          )}
        >
          <span aria-hidden="true" className="text-xl">
            {HOME_COUNTRY.flag}
          </span>
          <span className="flex-1 text-[15px] font-bold">
            {HOME_COUNTRY.name}
          </span>
          {korea && (
            <Check
              className="size-[18px] text-primary"
              strokeWidth={2.4}
              aria-hidden="true"
            />
          )}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={!korea}
          onClick={() => onChange(false)}
          className={cn(
            "flex h-[52px] items-center gap-2.5 rounded-xl border px-3.5 text-left",
            korea ? "border-border bg-card" : "border-ink-icon bg-muted",
          )}
        >
          <Globe
            className="size-5 text-ink-icon"
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <span className="flex-1 text-[15px] font-bold text-muted-foreground">
            다른 나라
          </span>
          <span className="rounded-lg bg-muted px-2 py-[3px] text-[11px] font-bold text-ink-icon">
            준비 중
          </span>
        </button>
      </div>
    </div>
  );
}

function Waitlist() {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13.5px] leading-relaxed text-muted-foreground">
        아직 한국만 지원해요. 어느 나라를 먼저 열면 좋을지 알려주시면 순서를
        정하는 데 반영할게요.
      </p>
      <ul className="flex flex-col gap-1.5">
        {COUNTRIES.filter((c) => !c.available).map((c) => (
          <li
            key={c.code}
            className="flex h-[46px] items-center gap-2.5 rounded-xl border bg-background px-3.5"
          >
            <span aria-hidden="true" className="text-[17px]">
              {c.flag}
            </span>
            <span className="flex-1 text-sm">{c.name}</span>
            <span className="text-[11.5px] text-ink-icon">{c.service}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() =>
          toast("알림 신청은 곧 열려요", {
            description: "기능 추가 예정이에요.",
          })
        }
        className="h-[46px] rounded-xl border border-primary bg-card text-sm font-bold text-primary"
      >
        열리면 알림 받기
      </button>
    </div>
  );
}

const MIN_DAY = "2010-02-01"; // chart data starts Feb 2010

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
  const [korea, setKorea] = useState(true);
  const today = toDayParam(new Date());
  const valid = !!parseDay(enlist) && enlist >= MIN_DAY && enlist <= today;
  const plan = useMemo(
    () => (valid ? computeService(parseDay(enlist)!, branch) : null),
    [valid, enlist, branch],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    navigate(`/dday?${new URLSearchParams({ d: enlist, b: branch })}`);
  };

  if (saved) return <Navigate to={`/dday?${saved}`} replace />;

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

      <form
        id="enlist-form"
        onSubmit={submit}
        className="flex flex-col gap-6 rounded-[20px] border bg-card px-5 py-6"
      >
        <CountryPicker korea={korea} onChange={setKorea} />

        {korea ? (
          <>
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
              <BranchSegment
                value={branch}
                onChange={setBranch}
                labelId="branch-label"
              />
              <span
                className="text-[13px] text-muted-foreground"
                aria-live="polite"
              >
                {plan
                  ? `${branch} ${plan.baseMonths}개월${plan.reductionDays ? ` − ${plan.reductionDays}일 단축` : ""} · ${fullDot(plan.discharge)} 전역`
                  : `${branch} 현재 복무기간 ${SERVICE_MONTHS[branch]}개월 기준`}
              </span>
            </div>

            <p className="rounded-[10px] bg-background px-3 py-2.5 text-[13px] leading-relaxed text-muted-foreground">
              전역일은 병역법 기준(단계적 단축 포함), 진급일은 당시 진급
              기준으로 계산해요. 실제와 다르면 다음 화면에서 고칠 수 있어요.
            </p>
          </>
        ) : (
          <Waitlist />
        )}
      </form>

      <div className="flex-1" />

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          form="enlist-form"
          disabled={!korea || !valid}
          className={cn(
            "flex h-14 items-center justify-center rounded-[14px] bg-primary text-[17px] font-bold text-primary-foreground transition-opacity",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50",
          )}
        >
          {!korea
            ? "한국을 선택해주세요"
            : editing
              ? "저장하고 보기"
              : "내 D-day·입대곡 보기"}
        </button>
        <span className="text-center text-xs text-muted-foreground">
          {korea
            ? "써클차트 디지털차트 기준 · 2010년 2월 이후 입대자"
            : "다른 나라는 D-day부터 먼저 열 예정이에요"}
        </span>
      </div>
    </MobileShell>
  );
}
