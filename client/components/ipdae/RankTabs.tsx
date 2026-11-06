import { Lock } from "lucide-react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RANKS, type Rank } from "@/lib/service";
import { cn } from "@/lib/utils";

/** Underlined 이병/일병/상병/병장 tabs; ranks not reached yet show a lock. */
export default function RankTabs({ locked = [] }: { locked?: Rank[] }) {
  return (
    <TabsList className="mx-4 mt-3 grid h-auto grid-cols-4 rounded-none border-b bg-transparent p-0">
      {RANKS.map((rank) => {
        const isLocked = locked.includes(rank);
        return (
          <TabsTrigger
            key={rank}
            value={rank}
            aria-label={isLocked ? `${rank} (아직 열리지 않음)` : undefined}
            className={cn(
              "-mb-px h-[46px] gap-1 rounded-none border-b-[3px] border-transparent px-0 text-[15px] font-bold text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none",
              isLocked && "text-[#8A8F80]",
            )}
          >
            {isLocked && <Lock className="size-[13px]" strokeWidth={2.2} aria-hidden="true" />}
            {rank}
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
}
