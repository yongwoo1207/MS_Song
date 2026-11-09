import { Link, useLocation } from "react-router-dom";
import { ChevronRight, MessagesSquare } from "lucide-react";

/**
 * Home card that opens the 선후임 소통 space in 커뮤니티: 현역 talk to
 * 예비역 선배, 예비역 to 현역 후임.
 */
export default function TalkLinkCard({ reserve }: { reserve: boolean }) {
  const { search } = useLocation();
  return (
    <Link
      to={`/community/talk${search}`}
      className="flex items-center gap-3 rounded-[18px] border bg-card px-4 py-3.5"
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary"
      >
        <MessagesSquare className="size-5" strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[14.5px] font-bold">
          {reserve ? "현역들에게 한마디" : "예비역 선배와 한마디"}
        </span>
        <span className="text-xs leading-normal text-muted-foreground">
          {reserve
            ? "복무 중인 후임들과 이야기 나누는 커뮤니티 공간이에요."
            : "먼저 전역한 선배들과 이야기 나누는 커뮤니티 공간이에요."}
        </span>
      </span>
      <ChevronRight
        className="size-5 shrink-0 text-ink-icon"
        strokeWidth={2}
        aria-hidden="true"
      />
    </Link>
  );
}
