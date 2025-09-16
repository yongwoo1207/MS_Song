import { useCallback, useMemo, useState } from "react";
import { getChartByDate } from "@/lib/api";
import type { ChartResult } from "@shared/api";

export function useEnlistmentDate() {
  const [date, setDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ChartResult | null>(null);

  const onChange = useCallback((value: string) => {
    setDate(value);
  }, []);

  const fetchChart = useCallback(async () => {
    if (!date) {
      setError("입대 월��� 선택해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getChartByDate(date);
      if (!data) {
        setResult(null);
        setError("차트 데이터를 찾을 수 없어요.");
      } else {
        setResult(data);
      }
    } catch (e) {
      setError("오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [date]);

  const meta = useMemo(() => ({ hasDate: Boolean(date) }), [date]);

  return { date, onChange, fetchChart, loading, error, result, meta };
}
