import { RequestHandler } from "express";
import { ChartResult, ChartMonth } from "../../shared/api";
import { chartsDB } from "../../shared/data/charts";

// Normalize 'YYYY-M' or 'YYYY-MM' => 'YYYY-M'
function normalizeKey(input: string): string | null {
  const m = input.match(/^(\d{4})-(\d{1,2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (!y || mo < 1 || mo > 12) return null;
  return `${y}-${mo}`;
}

export const handleGetChart: RequestHandler = (req, res) => {
  const raw = (req.query.date as string) || "";
  // Accept both ISO date and YYYY-M
  let key: string | null = null;
  if (/^\d{4}-\d{1,2}$/.test(raw)) {
    key = normalizeKey(raw);
  } else {
    const d = new Date(raw);
    if (!isNaN(d.getTime())) key = `${d.getFullYear()}-${d.getMonth() + 1}`;
  }
  if (!key) return res.status(400).json({ message: "Invalid date" });

  const month: ChartMonth | undefined = chartsDB[key!];
  if (!month) return res.status(404).json({ message: "No chart data" });

  const payload: ChartResult = {
    month: month.month,
    exactMatch: true,
    songs: month.songs,
  };
  res.status(200).json(payload);
};
