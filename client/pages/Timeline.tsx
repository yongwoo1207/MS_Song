import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { ExternalLink, Heart, MessageCircle } from "lucide-react";
import { toast } from "sonner";
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
import { useTimeline } from "@/hooks/useTimeline";
import { useEvents } from "@/hooks/useEvents";
import { ddayStatus } from "@/lib/dday";
import { type ServiceEvent, eventDateLabel } from "@/lib/events";
import {
  type Memory,
  type MemoryAuthor,
  cohortLabel,
  cohortMonthOf,
} from "@/lib/memories";
import { type ServiceMonth, asMonthSong, serviceMonths } from "@/lib/timeline";
import { cn } from "@/lib/utils";

const SONG_PREVIEW = 2; // song memories shown per month before "모두 보기"

/**
 * 타임라인: the user's service month by month. Each chapter shows that
 * month's #1 song, its major issues (사건) and the memories people left on
 * that month's songs. Nothing is written here directly. A bar of the whole
 * service stays pinned on top and follows the chapter being read.
 */
export default function Timeline() {
  const { plan } = useServicePlan();
  const player = usePlayer();
  const chart = useChartDB();
  const months = useMemo(() => (plan ? serviceMonths(plan) : []), [plan]);
  const cohortMonth = plan ? cohortMonthOf(plan.enlist) : "";
  const range =
    months.length > 0
      ? {
          from: months[0].param,
          to: months[months.length - 1].param,
        }
      : null;
  const { songsByMonth, isLoading, isError, refetch, remove, like } =
    useTimeline(range);
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

  const author: MemoryAuthor = {
    cohortMonth,
    branch: plan.branch,
    isReserve: ddayStatus(plan).status === "done",
  };
  const total = songsByMonth
    ? [...songsByMonth.values()].reduce((n, list) => n + list.length, 0)
    : 0;
  const onError = (err: Error) => toast(err.message);

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
          : isLoading
            ? "불러오는 중…"
            : `달마다 그 달 1위곡과 주요 이슈, 그 달 노래에 남겨진 추억을 모았어요${total ? ` · 추억 ${total}개` : ""}.`}
      </p>

      {isError && (
        <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-xl bg-muted px-3.5 py-2.5 text-[13px] text-muted-foreground">
          추억을 불러오지 못했어요.
          <button
            type="button"
            onClick={() => refetch()}
            className="h-8 rounded-lg border bg-card px-3 text-xs font-bold text-primary"
          >
            다시 시도
          </button>
        </div>
      )}

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
            songMemories={songsByMonth?.get(m.param) ?? []}
            player={player}
            onLike={(id) => like.mutate(id, { onError })}
            onDelete={(id) => remove.mutate(id, { onError })}
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
  songMemories,
  player,
  onLike,
  onDelete,
}: {
  sectionRef: (el: HTMLElement | null) => void;
  month: ServiceMonth;
  chart: ChartDB | undefined;
  events: ServiceEvent[];
  /** Memories left on songs, filed under this month's chart */
  songMemories: Memory[];
  player: Player;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [songsExpanded, setSongsExpanded] = useState(false);
  const top = chart?.[month.key]?.songs.find((s) => s.rank === 1);
  const songsShown = songsExpanded
    ? songMemories
    : songMemories.slice(0, SONG_PREVIEW);

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

      {songMemories.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <h3 className="flex items-center gap-1 text-[11.5px] font-bold text-ink-icon">
            <MessageCircle
              className="size-3.5"
              strokeWidth={2.2}
              aria-hidden="true"
            />
            이 달 노래에 남긴 추억 {songMemories.length}
          </h3>
          <ul className="flex flex-col rounded-xl bg-background px-3 py-2">
            {songsShown.map((m) => (
              <SongMemoryRow
                key={m.id}
                memory={m}
                onLike={() => onLike(m.id)}
                onDelete={() => onDelete(m.id)}
              />
            ))}
          </ul>
          {songMemories.length > SONG_PREVIEW && (
            <button
              type="button"
              onClick={() => setSongsExpanded((v) => !v)}
              aria-expanded={songsExpanded}
              className="h-8 rounded-xl text-[12px] font-bold text-primary"
            >
              {songsExpanded
                ? "접기"
                : `노래 추억 ${songMemories.length}개 모두 보기`}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function SongMemoryRow({
  memory: m,
  onLike,
  onDelete,
}: {
  memory: Memory;
  onLike: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex flex-col gap-1 border-t border-muted py-2.5 first:border-t-0 first:pt-0.5">
      {m.song && (
        <span className="truncate text-[12px] font-bold text-primary">
          ♪ {m.song.title} · {m.song.artist}
        </span>
      )}
      <span className="text-[11px] text-ink-icon">
        {cohortLabel(m.cohortMonth)} · 당시 {m.rank}
        {m.isReserve ? " · 예비역" : ""}
        {m.mine ? " · 내 글" : ""}
      </span>
      <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed">
        {m.body}
      </p>
      <div className="flex items-center">
        <button
          type="button"
          onClick={onLike}
          aria-pressed={m.likedByMe}
          aria-label={`공감 ${m.likes}`}
          className={cn(
            "-ml-1 flex h-7 items-center gap-1 rounded-lg px-1 text-xs",
            m.likedByMe ? "text-primary" : "text-muted-foreground",
          )}
        >
          <Heart
            className={cn("size-3.5", m.likedByMe && "fill-current")}
            strokeWidth={2}
            aria-hidden="true"
          />
          {m.likes}
        </button>
        <span className="flex-1" />
        {m.mine && (
          <button
            type="button"
            onClick={onDelete}
            className="h-7 rounded-lg px-1 text-xs text-muted-foreground hover:text-destructive"
          >
            삭제
          </button>
        )}
      </div>
    </li>
  );
}
