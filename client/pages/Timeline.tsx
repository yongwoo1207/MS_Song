import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import type { ChartDB, ChartSong } from "@shared/api";
import MobileShell from "@/components/ipdae/MobileShell";
import AppHeader from "@/components/ipdae/AppHeader";
import BottomNav from "@/components/ipdae/BottomNav";
import NowPlaying from "@/components/ipdae/NowPlaying";
import TimelineBar from "@/components/ipdae/TimelineBar";
import { PlayIcon } from "@/components/ipdae/icons";
import { useServicePlan } from "@/hooks/useServicePlan";
import { usePlayer, type Player } from "@/hooks/usePlayer";
import { useChartDB } from "@/hooks/useRankChart";
import { useEvents } from "@/hooks/useEvents";
import { type ServiceEvent, eventDateLabel } from "@/lib/events";
import { writerOf } from "@/lib/memories";
import { type ServiceMonth, asMonthSong, serviceMonths } from "@/lib/timeline";

/**
 * 타임라인: the user's service month by month. Each chapter shows that
 * month's #1 song and its major issues (사건). Memories left on songs live
 * in 커뮤니티 > 음악, not here. A bar of the whole
 * service stays pinned on top and follows the chapter being read.
 */
export default function Timeline() {
  const { plan } = useServicePlan();
  const player = usePlayer();
  const chart = useChartDB();
  const months = useMemo(() => (plan ? serviceMonths(plan) : []), [plan]);
  const range =
    months.length > 0
      ? {
          from: months[0].param,
          to: months[months.length - 1].param,
        }
      : null;
  const events = useEvents(range);
  const eventMonths = useMemo(
    () => new Set(events.data ? [...events.data.keys()] : []),
    [events.data],
  );

  // Pinned area (player + bar) and the chapter under it
  const pinned = useRef<HTMLDivElement>(null);
  const [pinnedHeight, setPinnedHeight] = useState(0);
  const chapters = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  // After a seek from the bar, hold its chapter until the user scrolls
  // (short last chapters can never reach the top on their own)
  const held = useRef(false);

  useEffect(() => {
    const el = pinned.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setPinnedHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [plan]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (held.current) return;
      const line = pinnedHeight + 16;
      let i = 0;
      chapters.current.forEach((el, idx) => {
        if (el && el.getBoundingClientRect().top <= line) i = idx;
      });
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      setActive(atBottom ? months.length - 1 : i);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const release = (e: Event) => {
      if (!pinned.current?.contains(e.target as Node)) held.current = false;
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchstart", release, { passive: true });
    window.addEventListener("keydown", release);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchstart", release);
      window.removeEventListener("keydown", release);
    };
  }, [months.length, pinnedHeight]);

  const seek = useCallback(
    (index: number, smooth: boolean) => {
      const el = chapters.current[index];
      if (!el) return;
      held.current = true;
      setActive(index);
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - pinnedHeight - 8,
        behavior: smooth ? "smooth" : "auto",
      });
    },
    [pinnedHeight],
  );

  if (!plan) return <Navigate to="/" replace />;

  const author = writerOf(plan);

  return (
    <MobileShell>
      <AppHeader plan={plan} title="내 군생활 타임라인" />
      <div ref={pinned} className="sticky top-0 z-20 bg-background">
        <NowPlaying player={player} author={author} />
        <TimelineBar
          plan={plan}
          months={months}
          active={Math.min(active, Math.max(0, months.length - 1))}
          eventMonths={eventMonths}
          onSeek={seek}
        />
      </div>

      <p className="px-4 pb-2 pt-2 text-xs leading-normal text-ink-icon">
        {months.length === 0
          ? "입대하면 달마다 챕터가 생겨요."
          : "달마다 그 달 1위곡과 주요 이슈를 모았어요."}
      </p>

      <main className="flex flex-col gap-2.5 px-4 pb-6">
        {months.map((m, i) => (
          <MonthChapter
            key={m.key}
            sectionRef={(el) => {
              chapters.current[i] = el;
            }}
            month={m}
            chart={chart.data}
            events={events.data?.get(m.param) ?? []}
            player={player}
          />
        ))}
      </main>

      <BottomNav />
    </MobileShell>
  );
}

function MonthChapter({
  sectionRef,
  month,
  chart,
  events,
  player,
}: {
  sectionRef: (el: HTMLElement | null) => void;
  month: ServiceMonth;
  chart: ChartDB | undefined;
  events: ServiceEvent[];
  player: Player;
}) {
  const top = chart?.[month.key]?.songs.find((s) => s.rank === 1);

  const play = (song: ChartSong) =>
    player.play(
      {
        rank: month.rank,
        month: month.param,
        songs: [asMonthSong(song, month.key)],
      },
      0,
    );

  return (
    <section
      ref={sectionRef}
      aria-label={month.label}
      className="flex flex-col gap-2.5 rounded-2xl border bg-card px-3.5 pb-3 pt-3"
    >
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-bold">{month.label}</h2>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-icon">
          {month.current && (
            <span className="rounded-md bg-accent px-1.5 py-[2px] font-sans font-bold text-primary">
              지금
            </span>
          )}
          나는 {month.rank} {month.hobong}호봉
        </span>
      </header>

      {top ? (
        <button
          type="button"
          disabled={!top.youtubeId}
          onClick={() => play(top)}
          className="flex items-center gap-2.5 rounded-xl bg-background px-3 py-2 text-left disabled:opacity-60"
        >
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <PlayIcon className="size-3.5" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13.5px] font-bold">
              {top.title}
            </span>
            <span className="truncate text-[11.5px] text-muted-foreground">
              {top.artist} · 이 달 1위
            </span>
          </span>
        </button>
      ) : (
        <p className="rounded-xl bg-background px-3 py-2.5 text-[12.5px] text-muted-foreground">
          {chart ? "이 달 차트는 다음 달 초에 집계돼요" : "차트를 불러오는 중…"}
        </p>
      )}

      {events.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-[11.5px] font-bold text-ink-icon">
            이 달의 주요 이슈
          </h3>
          <ul className="flex flex-col gap-1.5">
            {events.map((e) => (
              <li
                key={e.id}
                className="flex flex-col gap-1 rounded-xl border border-dashed px-3 py-2"
              >
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="text-[13px] font-bold">{e.title}</span>
                  <span className="font-mono text-[10.5px] text-ink-icon">
                    {eventDateLabel(e)}
                  </span>
                </div>
                <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                  {e.summary}
                </p>
                {e.sourceUrl && (
                  <a
                    href={e.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-fit items-center gap-0.5 text-[11px] text-ink-icon underline-offset-2 hover:underline"
                  >
                    출처
                    <ExternalLink className="size-2.5" aria-hidden="true" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
