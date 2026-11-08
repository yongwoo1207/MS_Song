import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { ExternalLink, Heart, PenLine, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { ChartDB, ChartSong } from "@shared/api";
import MobileShell from "@/components/ipdae/MobileShell";
import AppHeader from "@/components/ipdae/AppHeader";
import BottomNav from "@/components/ipdae/BottomNav";
import NowPlaying from "@/components/ipdae/NowPlaying";
import { PlayIcon } from "@/components/ipdae/icons";
import { useServicePlan } from "@/hooks/useServicePlan";
import { usePlayer, type Player } from "@/hooks/usePlayer";
import { useChartDB } from "@/hooks/useRankChart";
import { useTimeline } from "@/hooks/useTimeline";
import { useEvents } from "@/hooks/useEvents";
import { ddayStatus } from "@/lib/dday";
import { type ServiceEvent, eventDateLabel } from "@/lib/events";
import {
  MEMORY_MAX_LENGTH,
  type Memory,
  type MemoryAuthor,
  type NewMonthMemory,
  cohortLabel,
  cohortMonthOf,
} from "@/lib/memories";
import { type ServiceMonth, asMonthSong, serviceMonths } from "@/lib/timeline";
import { cn } from "@/lib/utils";

const PREVIEW = 3; // records shown per month before "모두 보기"

/**
 * 타임라인: the user's service month by month. Each chapter shows that
 * month's #1 song and major issues (사건), and the records people wrote
 * about that month of their service.
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
  const { byMonth, isLoading, isError, refetch, add, remove, like } =
    useTimeline(range);
  const events = useEvents(range);

  if (!plan) return <Navigate to="/" replace />;

  const author: MemoryAuthor = {
    cohortMonth,
    branch: plan.branch,
    isReserve: ddayStatus(plan).status === "done",
  };
  const total = byMonth
    ? [...byMonth.values()].reduce((n, list) => n + list.length, 0)
    : 0;
  const onError = (err: Error) => toast(err.message);

  return (
    <MobileShell>
      <AppHeader plan={plan} title="내 군생활 타임라인" />
      <NowPlaying player={player} author={author} />

      <p className="px-4 pb-2 pt-2 text-xs leading-normal text-ink-icon">
        {months.length === 0
          ? "입대하면 달마다 챕터가 생겨요."
          : isLoading
            ? "기록을 모으는 중…"
            : `달마다 그 달 1위곡과 주요 이슈를 모았어요. 그 달이 어땠는지 남겨보세요${total ? ` · 기록 ${total}개` : ""}.`}
      </p>

      {isError && (
        <div className="mx-4 mb-2 flex items-center justify-between gap-2 rounded-xl bg-muted px-3.5 py-2.5 text-[13px] text-muted-foreground">
          기록을 불러오지 못했어요.
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
        {months.map((m) => (
          <MonthChapter
            key={m.key}
            month={m}
            chart={chart.data}
            events={events.data?.get(m.param) ?? []}
            records={byMonth?.get(m.param) ?? []}
            player={player}
            author={author}
            saving={add.isPending}
            onAdd={(input, done) =>
              add.mutate(input, {
                onSuccess: () => {
                  done();
                  toast("기록을 남겼어요");
                },
                onError,
              })
            }
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
  month,
  chart,
  events,
  records,
  player,
  author,
  saving,
  onAdd,
  onLike,
  onDelete,
}: {
  month: ServiceMonth;
  chart: ChartDB | undefined;
  events: ServiceEvent[];
  records: Memory[];
  player: Player;
  author: MemoryAuthor;
  saving: boolean;
  onAdd: (input: NewMonthMemory, done: () => void) => void;
  onLike: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [writing, setWriting] = useState(false);
  const top = chart?.[month.key]?.songs.find((s) => s.rank === 1);
  const shown = expanded ? records : records.slice(0, PREVIEW);

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

      {records.length > 0 && (
        <ul className="flex flex-col" aria-label="이 달의 기록">
          {shown.map((m) => (
            <RecordRow
              key={m.id}
              memory={m}
              onLike={() => onLike(m.id)}
              onDelete={() => onDelete(m.id)}
            />
          ))}
        </ul>
      )}

      {records.length > PREVIEW && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="h-9 rounded-xl border bg-card text-[12.5px] font-bold text-primary"
        >
          {expanded ? "접기" : `이 달 기록 ${records.length}개 모두 보기`}
        </button>
      )}

      {writing ? (
        <MonthComposer
          month={month}
          author={author}
          saving={saving}
          onCancel={() => setWriting(false)}
          onSubmit={(body, done) =>
            onAdd(
              {
                aboutMonth: month.param,
                body,
                rank: month.rank,
                hobong: Math.min(12, month.hobong),
                author,
              },
              () => {
                done();
                setWriting(false);
              },
            )
          }
        />
      ) : (
        <button
          type="button"
          onClick={() => setWriting(true)}
          className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-accent text-[12.5px] font-bold text-primary"
        >
          <PenLine className="size-3.5" strokeWidth={2.2} aria-hidden="true" />
          {records.length === 0 ? "이 달 첫 기록 남기기" : "이 달 기록 남기기"}
        </button>
      )}
    </section>
  );
}

function RecordRow({
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
      <span className="text-[11px] text-ink-icon">
        {cohortLabel(m.cohortMonth)} · 당시 {m.rank}
        {m.hobong ? ` ${m.hobong}호봉` : ""}
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

function MonthComposer({
  month,
  author,
  saving,
  onCancel,
  onSubmit,
}: {
  month: ServiceMonth;
  author: MemoryAuthor;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (body: string, done: () => void) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const id = `record-${month.param}`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("내용을 입력해주세요");
      return;
    }
    onSubmit(text, () => setText(""));
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-1.5 rounded-xl bg-background px-3 pb-2.5 pt-2.5"
    >
      <label htmlFor={id} className="text-[12.5px] font-bold">
        {month.label}, 나는 어땠나요?
      </label>
      <p className="flex items-center gap-1 text-[11px] font-bold text-destructive">
        <ShieldAlert className="size-3.5 shrink-0" aria-hidden="true" />
        부대명, 위치, 일정은 쓰지 말아주세요
      </p>
      <textarea
        id={id}
        autoFocus
        value={text}
        maxLength={MEMORY_MAX_LENGTH}
        rows={3}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError("");
        }}
        placeholder="첫 휴가 나가서 제일 먼저 들은 노래…"
        aria-invalid={!!error}
        aria-describedby={`${id}-help`}
        className="min-h-[72px] resize-none rounded-xl border border-input bg-field px-3 py-2 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <div
        id={`${id}-help`}
        className="flex items-center justify-between gap-2 text-[11px]"
      >
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : (
          <span className="text-ink-icon">
            {cohortLabel(author.cohortMonth)} · 당시 {month.rank} {month.hobong}
            호봉{author.isReserve ? " · 예비역으로" : "으로"} 표시돼요
          </span>
        )}
        <span className="shrink-0 font-mono text-ink-icon">
          {text.length}/{MEMORY_MAX_LENGTH}
        </span>
      </div>
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 flex-1 rounded-xl border bg-card text-[13px] font-bold text-muted-foreground"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-10 flex-[2] rounded-xl bg-primary text-[13px] font-bold text-primary-foreground disabled:opacity-60"
        >
          남기기
        </button>
      </div>
    </form>
  );
}
