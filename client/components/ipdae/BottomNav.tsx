import { NavLink, useLocation } from "react-router-dom";
import { CalendarDays, MessageCircle, Music } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/dday", label: "홈", Icon: CalendarDays },
  { to: "/result", label: "차트", Icon: Music },
  { to: "/community", label: "커뮤니티", Icon: MessageCircle },
];

/** 홈 / 차트 / 커뮤니티 tab bar. Every tab shares the same ?d=…&b=… query. */
export default function BottomNav() {
  const { search } = useLocation();
  return (
    <nav
      aria-label="주요 화면"
      className="sticky bottom-0 z-20 mt-auto grid grid-cols-3 border-t bg-card px-4 pb-[max(env(safe-area-inset-bottom),6px)] pt-1"
    >
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={`${to}${search}`}
          replace
          className={({ isActive }) =>
            cn(
              "flex h-11 flex-col items-center justify-center gap-0.5 text-[11px] font-bold",
              isActive ? "text-primary" : "text-ink-icon hover:text-foreground",
            )
          }
        >
          <Icon className="size-[18px]" strokeWidth={2} aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
