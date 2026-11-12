import { cn } from "@/lib/utils";

/**
 * The 군번줄 mark on its own, in the current text colour. Same drawing as
 * the tab icon (public/favicon.svg), so the two always match.
 */
export function TagMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <path
        transform="rotate(16 50 50)"
        fill="currentColor"
        fillRule="evenodd"
        d="M34,6 h32 a11,11 0 0 1 11,11 v66 a11,11 0 0 1 -11,11 h-32 a11,11 0 0 1 -11,-11 v-66 a11,11 0 0 1 11,-11 z
           M53,24 a7,7 0 1 0 14,0 a7,7 0 1 0 -14,0 z"
      />
    </svg>
  );
}

/** 군번줄 mark + IPDAEGOK wordmark, shown above the input headline. */
export default function BrandMark() {
  return (
    <div className="flex items-center gap-2 text-primary">
      <TagMark className="size-[26px]" />
      <span className="font-brand text-[15px] font-bold leading-none tracking-[0.09em]">
        IPDAEGOK
      </span>
    </div>
  );
}
