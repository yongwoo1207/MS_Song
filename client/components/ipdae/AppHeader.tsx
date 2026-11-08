import { Link } from "react-router-dom";
import { Bell, UserRound } from "lucide-react";
import type { ServicePlan } from "@/lib/service";
import { fullDot } from "@/lib/format";
import { useUnreadCount } from "@/hooks/useNotifications";

/** Two-line header shared by the main tabs, with 알림 and 내 활동. */
export default function AppHeader({
  plan,
  title,
}: {
  plan: ServicePlan;
  title: string;
}) {
  const unread = useUnreadCount();
  const icon =
    "relative flex size-11 shrink-0 items-center justify-center text-ink-icon hover:text-foreground";
  return (
    <header className="flex items-center justify-between pb-1 pl-5 pr-2 pt-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="font-mono text-[11px] text-ink-icon">
          {fullDot(plan.enlist)} {plan.branch} 입대
        </span>
        <h1 className="truncate text-lg font-bold">{title}</h1>
      </div>
      <nav className="flex shrink-0 items-center" aria-label="내 메뉴">
        <Link
          to="/notifications"
          aria-label={unread > 0 ? `알림, 새 알림 ${unread}개` : "알림"}
          className={icon}
        >
          <Bell className="size-5" strokeWidth={2} />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-mono text-[10px] font-bold leading-none text-white"
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Link>
        <Link to="/me" aria-label="내 활동" className={icon}>
          <UserRound className="size-5" strokeWidth={2} />
        </Link>
      </nav>
    </header>
  );
}
