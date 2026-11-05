import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  type ServiceOverrides,
  computeService,
  isBranch,
  parseDay,
  toDayParam,
} from "@/lib/service";

const OVERRIDE_KEYS = { pfc: "p1", cpl: "p2", sgt: "p3", discharge: "e" } as const;

/**
 * Service plan derived from the URL (?d=YYYY-MM-DD&b=육군 plus optional
 * p1/p2/p3/e overrides), so results survive refresh and can be shared.
 */
export function useServicePlan() {
  const [params, setParams] = useSearchParams();

  const plan = useMemo(() => {
    const enlist = parseDay(params.get("d"));
    const branch = params.get("b");
    if (!enlist || !isBranch(branch)) return null;
    const overrides: ServiceOverrides = {};
    for (const [field, key] of Object.entries(OVERRIDE_KEYS)) {
      const d = parseDay(params.get(key));
      if (d) overrides[field as keyof ServiceOverrides] = d;
    }
    return computeService(enlist, branch, overrides);
  }, [params]);

  const setOverrides = useCallback(
    (o: Required<ServiceOverrides>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [field, key] of Object.entries(OVERRIDE_KEYS)) {
            next.set(key, toDayParam(o[field as keyof ServiceOverrides]!));
          }
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { plan, setOverrides };
}
