import { useEffect, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  type ServiceOverrides,
  type ServicePlan,
  isOrdered,
  parseDay,
  toDayParam,
} from "@/lib/service";

const FIELDS = [
  { key: "pfc", label: "일병 진급일" },
  { key: "cpl", label: "상병 진급일" },
  { key: "sgt", label: "병장 진급일" },
  { key: "discharge", label: "전역일" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

interface EditDatesDrawerProps {
  plan: ServicePlan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (o: Required<ServiceOverrides>) => void;
}

const fromPlan = (plan: ServicePlan): Record<FieldKey, string> => ({
  pfc: toDayParam(plan.periods[1].start),
  cpl: toDayParam(plan.periods[2].start),
  sgt: toDayParam(plan.periods[3].start),
  discharge: toDayParam(plan.discharge),
});

/** Lets the user correct auto-calculated promotion and discharge days. */
export default function EditDatesDrawer({ plan, open, onOpenChange, onSave }: EditDatesDrawerProps) {
  const [values, setValues] = useState(() => fromPlan(plan));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(fromPlan(plan));
      setError(null);
    }
  }, [open, plan]);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const dates = FIELDS.map((f) => parseDay(values[f.key]));
    if (dates.some((d) => !d) || !isOrdered([plan.enlist, ...(dates as Date[])])) {
      setError("입대일 이후, 진급 순서대로 날짜를 입력해 주세요.");
      return;
    }
    const [pfc, cpl, sgt, discharge] = dates as Date[];
    onSave({ pfc, cpl, sgt, discharge });
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-[430px] bg-background">
        <form onSubmit={save}>
          <DrawerHeader className="text-left">
            <DrawerTitle>진급일·전역일 고치기</DrawerTitle>
            <DrawerDescription>실제 날짜로 바꾸면 계급별 차트도 다시 계산돼요.</DrawerDescription>
          </DrawerHeader>
          <div className="grid grid-cols-2 gap-3 px-4">
            {FIELDS.map((f) => (
              <div key={f.key} className="flex flex-col gap-1.5">
                <label htmlFor={`edit-${f.key}`} className="text-[13px] font-bold">
                  {f.label}
                </label>
                <input
                  id={`edit-${f.key}`}
                  type="date"
                  value={values[f.key]}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  className="h-11 rounded-xl border border-input bg-field px-3 font-mono text-[15px] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </div>
            ))}
          </div>
          {error && (
            <p role="alert" className="px-4 pt-3 text-[13px] text-destructive">
              {error}
            </p>
          )}
          <DrawerFooter>
            <button
              type="submit"
              className="flex h-12 items-center justify-center rounded-xl bg-primary text-[15px] font-bold text-primary-foreground"
            >
              저장
            </button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
