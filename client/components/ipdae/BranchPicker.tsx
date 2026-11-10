import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { BRANCHES, type Branch, SERVICE_MONTHS } from "@/lib/service";
import { cn } from "@/lib/utils";

/** Small print next to a 군 종류 that needs one. */
const NOTES: Partial<Record<Branch, string>> = {
  카투사: "육군 소속",
  공익: "사회복무요원",
};

/**
 * 군 종류 as a field like the date input; opens a sheet listing every 군 종류
 * with its current service length.
 */
export default function BranchPicker({
  value,
  onChange,
  labelId,
}: {
  value: Branch;
  onChange: (b: Branch) => void;
  labelId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-labelledby={`${labelId} branch-value`}
        className="flex h-[52px] items-center gap-2 rounded-xl border border-input bg-field px-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <span
          id="branch-value"
          className="flex min-w-0 flex-1 items-baseline gap-1.5"
        >
          <span className="text-[17px] font-bold">{value}</span>
          {NOTES[value] && (
            <span className="truncate text-[13px] text-muted-foreground">
              {NOTES[value]}
            </span>
          )}
        </span>
        <ChevronDown
          className="size-[18px] text-ink-icon"
          strokeWidth={2.2}
          aria-hidden="true"
        />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="mx-auto max-w-[430px] px-4 pb-8">
          <DrawerTitle className="pt-4 text-base">군 종류</DrawerTitle>
          <DrawerDescription className="pb-3 text-xs">
            지금 기준 복무기간이에요. 전역일은 입대일에 맞춰 따로 계산해요.
          </DrawerDescription>
          <ul
            className="flex flex-col gap-1.5"
            role="listbox"
            aria-label="군 종류"
          >
            {BRANCHES.map((b) => (
              <li key={b} role="option" aria-selected={b === value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(b);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex h-12 w-full items-center gap-2 rounded-xl border px-3.5 text-left",
                    b === value
                      ? "border-primary bg-accent"
                      : "border-border bg-card",
                  )}
                >
                  <span className="text-[15px] font-bold">{b}</span>
                  {NOTES[b] && (
                    <span className="text-xs text-muted-foreground">
                      {NOTES[b]}
                    </span>
                  )}
                  <span className="ml-auto font-mono text-[13px] text-muted-foreground">
                    {SERVICE_MONTHS[b]}개월
                  </span>
                  <Check
                    className={cn(
                      "size-[18px] text-primary",
                      b !== value && "invisible",
                    )}
                    strokeWidth={2.4}
                    aria-hidden="true"
                  />
                </button>
              </li>
            ))}
          </ul>
        </DrawerContent>
      </Drawer>
    </>
  );
}
