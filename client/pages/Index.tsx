import { useMemo, useState } from "react";
import { useEnlistmentDate } from "@/hooks/useEnlistmentDate";
import SearchBar from "@/components/SearchBar";

export default function Index() {
  const { date, onChange, fetchChart, loading, error, result } = useEnlistmentDate();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!result) return [];
    const q = query.trim().toLowerCase();
    if (!q) return result.songs;
    return result.songs.filter((s) =>
      s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
    );
  }, [result, query]);

  return (
    <div className="grid gap-10">
      <section className="grid gap-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-[hsl(122_50%_38%)] to-[hsl(95_50%_42%)]">
            나의 입대곡, 그때의 인기차트
            <br />
          </h1>
          <p className="mt-3 text-muted-foreground">
            입대 월을 입력하면 그 달의 인기 차트와 뮤직비디오를 한 번에 보여드려요.
          </p>
        </div>
        <div className="mx-auto w-full max-w-3xl rounded-2xl border bg-card/70 backdrop-blur p-4 md:p-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-stretch md:items-end gap-3 md:gap-4">
            <div className="flex-1">
              <label htmlFor="enlist-date" className="block text-sm font-medium mb-1">입대 월</label>
              <input
                id="enlist-date"
                type="month"
                value={date}
                onChange={(e) => onChange(e.target.value)}
                className="w-full rounded-xl border bg-background/70 px-4 py-3 outline-none focus:ring-2 focus:ring-primary/40"
                aria-label="입대 월 선택"
              />
            </div>
            <button
              onClick={fetchChart}
              disabled={loading}
              className="shrink-0 md:w-40 inline-flex h-12 items-center justify-center rounded-xl bg-primary px-5 text-primary-foreground font-semibold shadow hover:shadow-md disabled:opacity-60"
            >
              {loading ? "불러오는 중..." : "차트 보기"}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          {result && !result.exactMatch && (
            <p className="mt-3 text-sm text-muted-foreground">
              정확한 데이터가 없어 가장 가까운 달({result.month})의 차트를 보여드려요.
            </p>
          )}
        </div>
      </section>

      {(loading || result) && (
        <section className="grid gap-6">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
            <h2 className="text-2xl font-bold tracking-tight">
              {result ? `${result.month} 인기차트` : "인기차트 불러오는 중"}
            </h2>
            <SearchBar value={query} onChange={setQuery} className="md:ml-auto md:w-80" />
          </div>

          {loading && (
            <div className="rounded-2xl border bg-card/70 p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 w-28 rounded bg-muted" />
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-4 w-full rounded bg-muted" />
                ))}
              </div>
              <div className="sr-only" aria-live="polite">로딩 중…</div>
            </div>
          )}

          {!loading && result && (
            <ul className="rounded-2xl border bg-card/70 divide-y">
              {filtered.map((s) => (
                <li
                  key={s.rank + s.title}
                  className="grid grid-cols-[56px_1fr] gap-4 items-center p-4"
                >
                  <div className="text-sm text-muted-foreground">#{String(s.rank).padStart(2, "0")}</div>
                  <div className="flex flex-col">
                    <span className="font-medium">{s.title}</span>
                    <span className="text-sm text-muted-foreground">{s.artist}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
