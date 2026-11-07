import { cn } from "@/lib/utils";

/** Small "기능 추가 예정" tag for screens whose backend isn't built yet. */
export default function ComingSoon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "whitespace-nowrap rounded-lg bg-muted px-2 py-[3px] text-[11px] font-bold text-ink-icon",
        className,
      )}
    >
      기능 추가 예정
    </span>
  );
}
