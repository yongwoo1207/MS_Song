import { cn } from "@/lib/utils";
import { PropsWithChildren } from "react";

/** Phone-width column used by the 입대곡 flow; centred on larger screens. */
export default function MobileShell({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className="min-h-[100dvh] bg-[#E7E4DA]">
      <div
        className={cn(
          "relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col bg-background text-foreground",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
