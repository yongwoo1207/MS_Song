import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RANKS } from "@/lib/service";

/** Underlined 이병/일병/상병/병장 tabs (Radix Tabs list, restyled). */
export default function RankTabs() {
  return (
    <TabsList className="mx-4 mt-3 grid h-auto grid-cols-4 rounded-none border-b bg-transparent p-0">
      {RANKS.map((rank) => (
        <TabsTrigger
          key={rank}
          value={rank}
          className="-mb-px h-[46px] rounded-none border-b-[3px] border-transparent px-0 text-[15px] font-bold text-muted-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
        >
          {rank}
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
