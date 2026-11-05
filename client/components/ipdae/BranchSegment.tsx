import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BRANCHES, type Branch, isBranch } from "@/lib/service";

interface BranchSegmentProps {
  value: Branch;
  onChange: (b: Branch) => void;
  labelId: string;
}

/** 4-way segmented control for 군 종류. */
export default function BranchSegment({ value, onChange, labelId }: BranchSegmentProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => isBranch(v) && onChange(v)}
      aria-labelledby={labelId}
      className="grid grid-cols-4 gap-1.5 rounded-xl bg-muted p-1"
    >
      {BRANCHES.map((b) => (
        <ToggleGroupItem
          key={b}
          value={b}
          className="h-11 rounded-[9px] px-0 text-[15px] font-bold text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-sm"
        >
          {b}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
