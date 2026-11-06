import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Music } from "lucide-react";
import type { Rank } from "@/lib/service";

/** "지금 내 상병 시절 노래" → 입대곡 tab. */
export default function SongsShortcut({ rank }: { rank: Rank }) {
  const { search } = useLocation();
  return (
    <Link
      to={`/result${search}`}
      className="flex items-center gap-3 rounded-2xl bg-accent p-3.5 text-foreground hover:bg-accent/80"
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"
      >
        <Music className="size-5" strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-bold">지금 내 {rank} 시절 노래</span>
        <span className="text-xs text-primary">매달 차트가 쌓여요 · 입대곡 탭에서 듣기</span>
      </span>
      <ChevronRight className="size-[18px] text-primary" strokeWidth={2} aria-hidden="true" />
    </Link>
  );
}
