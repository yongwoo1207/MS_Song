import { Link } from "react-router-dom";
import { FEEDBACK_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * 이용약관 · 개인정보처리방침 · 피드백. The 피드백 link only appears once
 * FEEDBACK_URL is set in lib/site.ts, so it is never a dead link.
 */
export default function SiteFooter({ className }: { className?: string }) {
  return (
    <nav
      aria-label="약관 및 문의"
      className={cn(
        "flex items-center justify-center gap-2 text-[11.5px] text-ink-icon",
        className,
      )}
    >
      <Link to="/terms" className="hover:text-foreground">
        이용약관
      </Link>
      <span aria-hidden="true">·</span>
      <Link to="/privacy" className="hover:text-foreground">
        개인정보처리방침
      </Link>
      {FEEDBACK_URL && (
        <>
          <span aria-hidden="true">·</span>
          <a
            href={FEEDBACK_URL}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground"
          >
            피드백
          </a>
        </>
      )}
    </nav>
  );
}
