import { ChartResult } from "@shared/api";

export const getChartByDate = async (date: string | Date): Promise<ChartResult | null> => {
  // Normalize to DB key: YYYY-M (no leading zero month)
  let year: number | null = null;
  let month: number | null = null;
  if (date instanceof Date) {
    year = date.getFullYear();
    month = date.getMonth() + 1;
  } else if (/^\d{4}-(\d{2}|\d{1})$/.test(date)) {
    const [y, m] = date.split("-");
    year = Number(y);
    month = Number(m.startsWith("0") ? m.slice(1) : m);
  } else {
    const d = new Date(date);
    if (!isNaN(d.getTime())) {
      year = d.getFullYear();
      month = d.getMonth() + 1;
    }
  }
  if (!year || !month) return null;
  const key = `${year}-${month}`; // e.g., 2025-5
  const params = new URLSearchParams({ date: key });
  try {
    const res = await fetch(`/api/charts?${params.toString()}`);
    if (!res.ok) return null;
    const data = (await res.json()) as ChartResult;
    return data;
  } catch {
    return null;
  }
};
