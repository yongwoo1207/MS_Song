import { Link, useLocation } from "react-router-dom";
import { ChevronRight, MessageCircle } from "lucide-react";

/** 전역자 홈: "후임에게 한마디 남기기" link card. */
export default function LeaveCta() {
  const { search } = useLocation();
  return (
    <Link
      to={`/leave${search}`}
      className="flex items-center gap-3 rounded-[18px] border-2 border-primary bg-card px-4 py-3 text-foreground"
    >
      <span
        aria-hidden="true"
        className="flex size-[38px] shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"
      >
        <MessageCircle className="size-[19px]" strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[14.5px] font-bold">후임에게 한마디 남기기</span>
        <span className="text-[11.5px] text-muted-foreground">지금 그 지점에 선 현역에게 바로 닿아요</span>
      </span>
      <ChevronRight className="size-[17px] text-primary" strokeWidth={2} aria-hidden="true" />
    </Link>
  );
}
