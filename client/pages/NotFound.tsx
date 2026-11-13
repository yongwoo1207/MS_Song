import { Link, useLocation } from "react-router-dom";
import { Compass } from "lucide-react";
import MobileShell from "@/components/ipdae/MobileShell";
import SiteFooter from "@/components/ipdae/SiteFooter";

/** Address that matches nothing. */
export default function NotFound() {
  const { pathname } = useLocation();
  return (
    <MobileShell className="items-center justify-center gap-5 px-8 py-16 text-center">
      <span
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-full bg-accent text-primary"
      >
        <Compass className="size-7" strokeWidth={2} />
      </span>
      <div className="flex flex-col gap-2">
        <h1 className="text-[22px] font-bold">없는 페이지예요</h1>
        <p className="text-[14px] leading-relaxed text-muted-foreground">
          주소가 바뀌었거나 잘못 입력된 것 같아요.
        </p>
        <p className="break-all font-mono text-[11.5px] text-ink-icon">
          {pathname}
        </p>
      </div>
      <Link
        to="/"
        className="flex h-12 items-center justify-center rounded-[14px] bg-primary px-6 text-[15px] font-bold text-primary-foreground"
      >
        처음으로
      </Link>
      <SiteFooter className="pt-2" />
    </MobileShell>
  );
}
