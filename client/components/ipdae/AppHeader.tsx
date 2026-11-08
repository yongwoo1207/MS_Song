import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import type { ServicePlan } from "@/lib/service";
import { fullDot } from "@/lib/format";
import { clearSavedEnlistment } from "@/hooks/useSavedEnlistment";

/** Two-line header shared by the D-day and 입대곡 tabs. */
export default function AppHeader({
  plan,
  title,
}: {
  plan: ServicePlan;
  title: string;
}) {
  const navigate = useNavigate();
  const reset = () => {
    clearSavedEnlistment();
    navigate("/", { replace: true });
  };
  return (
    <header className="flex items-center justify-between pb-1 pl-5 pr-3 pt-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-mono text-[11px] text-ink-icon">
          {fullDot(plan.enlist)} {plan.branch} 입대
        </span>
        <h1 className="truncate text-lg font-bold">{title}</h1>
      </div>
      <button
        type="button"
        onClick={reset}
        aria-label="입대일 지우고 처음으로"
        title="입대일 지우고 처음으로"
        className="flex size-11 shrink-0 items-center justify-center text-ink-icon hover:text-foreground"
      >
        <LogOut className="size-5" strokeWidth={2} />
      </button>
    </header>
  );
}
