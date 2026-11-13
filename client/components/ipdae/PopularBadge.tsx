import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 인기글 mark: a post that has reached POPULAR_MIN_LIKES 좋아요 and so shows
 * on the 인기 board (see lib/memories isPopular).
 */
export default function PopularBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-md bg-accent px-1.5 py-[3px] text-[10.5px] font-bold text-primary",
        className,
      )}
    >
      <Flame
        className="size-3 fill-current"
        strokeWidth={2}
        aria-hidden="true"
      />
      인기
    </span>
  );
}
