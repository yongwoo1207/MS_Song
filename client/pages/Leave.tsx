import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import MobileShell from "@/components/ipdae/MobileShell";
import ComingSoon from "@/components/ipdae/ComingSoon";
import { useServicePlan } from "@/hooks/useServicePlan";
import { ddayStatus } from "@/lib/dday";
import { cn } from "@/lib/utils";

const POINTS = [
  { days: 500, label: "막 자대 배치받은 무렵" },
  { days: 300, label: "제일 길게 느껴지던 때" },
  { days: 100, label: "세 자리에서 두 자리로" },
  { days: 30, label: "말년 휴가 앞두고" },
];
const MAX = 200;

/**
 * 후임에게 한마디: a veteran leaves a note for whoever stands at a chosen
 * D-day. The form works; saving needs a backend ("기능 추가 예정").
 */
export default function Leave() {
  const { plan } = useServicePlan();
  const navigate = useNavigate();
  const status = useMemo(() => (plan ? ddayStatus(plan) : null), [plan]);
  const [point, setPoint] = useState(300);
  const [text, setText] = useState("");

  if (!plan || !status) return <Navigate to="/" replace />;

  const cohort = `${plan.enlist.getFullYear()}년 ${plan.enlist.getMonth() + 1}월 군번`;
  const role = status.status === "done" ? "예비역" : "현역";

  return (
    <MobileShell>
      <header className="flex items-center gap-1 px-2.5 pb-1.5 pt-3">
        <button
          type="button"
          aria-label="뒤로"
          onClick={() => navigate(-1)}
          className="flex size-11 items-center justify-center text-foreground"
        >
          <ChevronLeft className="size-[21px]" strokeWidth={2} />
        </button>
        <h1 className="flex-1 text-lg font-bold">후임에게 한마디</h1>
        <ComingSoon className="mr-2" />
      </header>

      <main className="flex flex-1 flex-col gap-3 px-4 pt-1">
        <p className="text-sm leading-relaxed text-muted-foreground">
          지금 그 지점에 서 있는 현역에게 바로 닿아요. 날짜가 아니라{" "}
          <strong className="text-foreground">남은 일수</strong>를 기준으로
          전달돼요.
        </p>

        <section className="flex flex-col gap-2.5 rounded-2xl border bg-card px-4 py-3.5">
          <h2 id="point-label" className="text-[13px] font-bold">
            언제 서 있는 후임에게 보낼까요
          </h2>
          <div
            role="radiogroup"
            aria-labelledby="point-label"
            className="grid grid-cols-2 gap-1.5"
          >
            {POINTS.map((p) => {
              const on = point === p.days;
              return (
                <button
                  key={p.days}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPoint(p.days)}
                  className={cn(
                    "flex h-14 flex-col items-start justify-center gap-0.5 rounded-xl border px-3 text-left",
                    on ? "border-primary bg-accent" : "border-border bg-card",
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-sm font-bold",
                      on && "text-primary",
                    )}
                  >
                    D-{p.days}
                  </span>
                  <span
                    className={cn(
                      "text-[11px]",
                      on ? "text-primary" : "text-ink-icon",
                    )}
                  >
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
          <span className="text-[11.5px] text-ink-icon">
            내가 제일 힘들었던 시기를 고르면 돼요
          </span>
        </section>

        <section className="flex flex-col gap-2 rounded-2xl border bg-card px-4 pb-3 pt-3.5">
          <div className="flex items-center justify-between">
            <label htmlFor="msg" className="text-[13px] font-bold">
              한마디
            </label>
            <span className="font-mono text-[11.5px] text-ink-icon">
              {text.length} / {MAX}
            </span>
          </div>
          <textarea
            id="msg"
            value={text}
            maxLength={MAX}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="딱 이맘때가 제일 안 가요. 상병 달고 나면 체감 속도가 달라져요."
            className="min-h-[88px] resize-none rounded-xl border border-input bg-field px-3 py-2.5 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <div className="flex items-start gap-2 rounded-[10px] bg-muted px-3 py-2.5">
            <AlertTriangle
              className="mt-px size-[15px] shrink-0 text-muted-foreground"
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className="text-[11.5px] leading-normal text-muted-foreground">
              부대명, 위치, 일정, 훈련 내용은 쓰지 말아주세요. 군사 보안 위반이
              될 수 있어요.
            </span>
          </div>
        </section>

        <section className="flex items-center gap-2.5 rounded-[14px] bg-accent px-3.5 py-3">
          <span
            aria-hidden="true"
            className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-bold text-primary-foreground"
          >
            {String(plan.enlist.getFullYear()).slice(2)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-px">
            <span className="text-[13px] font-bold">
              {cohort} · {role}
            </span>
            <span className="text-[11.5px] text-primary">
              이렇게만 표시돼요. 이름은 보이지 않아요.
            </span>
          </span>
        </section>
      </main>

      <div className="flex flex-col gap-2 px-4 pb-7 pt-3.5">
        <button
          type="button"
          onClick={() =>
            toast("한마디 남기기는 곧 열려요", {
              description: "기능 추가 예정이에요. 지금은 글이 저장되지 않아요.",
            })
          }
          className="h-14 rounded-[14px] bg-primary text-base font-bold text-primary-foreground"
        >
          남기고 나가기
        </button>
        <span className="text-center text-[11.5px] text-ink-icon">
          신고가 쌓이면 자동으로 숨겨지고 검토돼요
        </span>
      </div>
    </MobileShell>
  );
}
