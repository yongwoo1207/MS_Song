import { Link, useLocation } from "react-router-dom";
import { ChevronRight, MessagesSquare } from "lucide-react";

const COPY = {
  serving: {
    title: "예비역 선배와 한마디",
    sub: "먼저 전역한 선배들과 이야기 나누는 커뮤니티 공간이에요.",
  },
  reserve: {
    title: "현역들에게 한마디",
    sub: "복무 중인 후임들과 이야기 나누는 커뮤니티 공간이에요.",
  },
  pre: {
    title: "선배들에게 물어보기",
    sub: "입대 전에 궁금한 걸 먼저 다녀온 선배들에게 물어보세요.",
  },
} as const;

/**
 * Home card that opens the 선후임 소통 space in 커뮤니티: 현역 talk to
 * 예비역 선배, 예비역 to 현역 후임, 입대 예정자 ask both.
 */
export default function TalkLinkCard({ who }: { who: keyof typeof COPY }) {
  const copy = COPY[who];
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
        <span className="text-[14.5px] font-bold">{copy.title}</span>
        <span className="text-xs leading-normal text-muted-foreground">
          {copy.sub}
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
