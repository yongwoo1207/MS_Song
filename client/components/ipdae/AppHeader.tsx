import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import { type ServicePlan, toDayParam } from "@/lib/service";
import { fullDot } from "@/lib/format";

/** Two-line header shared by the D-day and 입대곡 tabs. */
export default function AppHeader({ plan, title }: { plan: ServicePlan; title: string }) {
  const edit = new URLSearchParams({ edit: "1", d: toDayParam(plan.enlist), b: plan.branch });
  return (
    <header className="flex items-center justify-between pb-1 pl-5 pr-3 pt-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">
          {fullDot(plan.enlist)} {plan.branch} 입대
        </span>
        <h1 className="truncate text-lg font-bold">{title}</h1>
      </div>
      <Link
        to={`/?${edit}`}
        aria-label="입대 정보 수정"
        className="flex size-11 shrink-0 items-center justify-center text-foreground"
      >
        <Pencil className="size-5" strokeWidth={2} />
      </Link>
    </header>
  );
}
