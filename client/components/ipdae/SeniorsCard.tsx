import { Link, useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { dLabel } from "@/lib/dday";
import ComingSoon from "./ComingSoon";

/**
 * "D-n에 섰던 선배들": one-liners veterans left for this exact D-day.
 * Placeholder until posts can be stored.
 */
export default function SeniorsCard({ daysLeft }: { daysLeft: number }) {
  const { search } = useLocation();
  return (
    <section className="flex flex-col gap-2 rounded-[18px] border-2 border-primary bg-card px-4 pb-3 pt-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[13.5px] font-bold text-primary">
          <MessageCircle className="size-[15px]" strokeWidth={2} aria-hidden="true" />
          {dLabel(daysLeft)}에 섰던 선배들
        </h2>
        <ComingSoon />
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        같은 D-day를 먼저 지나간 예비역들이 남긴 한마디가 여기에 떠요.
      </p>
      <div className="flex justify-end border-t border-muted pt-2">
        <Link
          to={`/community${search}`}
          className="flex h-8 items-center rounded-2xl bg-accent px-3 text-xs font-bold text-primary"
        >
          커뮤니티 보기
        </Link>
      </div>
    </section>
  );
}
