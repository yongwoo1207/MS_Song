import { NavLink, useLocation } from "react-router-dom";
import { CalendarDays, Music } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { to: "/dday", label: "D-day", Icon: CalendarDays },
  { to: "/result", label: "입대곡", Icon: Music },
];

/** D-day / 입대곡 tab bar. Both tabs share the same ?d=…&b=… query. */
export default function BottomNav() {
  const { search } = useLocation();
  return (
    <nav
      aria-label="주요 화면"
      className="sticky bottom-0 z-20 mt-auto grid grid-cols-2 border-t bg-card px-6 pb-[max(env(safe-area-inset-bottom),14px)] pt-1.5"
    >
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={`${to}${search}`}
          replace
          className={({ isActive }) =>
            cn(
              "flex h-14 flex-col items-center justify-center gap-1 text-xs font-bold",
              isActive ? "text-primary" : "text-ink-icon hover:text-foreground",
            )
          }
        >
          <Icon className="size-6" strokeWidth={2} aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
