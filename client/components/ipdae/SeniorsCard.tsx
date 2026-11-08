import { useMemo, useState } from "react";
import { Heart, MessageCircle, PenLine, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { useLetters } from "@/hooks/useLetters";
import {
  type HobongSlot,
  LETTER_MAX_LENGTH,
  type Memory,
  type MemoryAuthor,
  cohortLabel,
  cohortMonthOf,
  timeAgo,
} from "@/lib/memories";
import type { ServicePlan } from "@/lib/service";
import { hobongOn, rankHobongOn } from "@/lib/timeline";
import { cn } from "@/lib/utils";

const PREVIEW = 3;
const MAX_HOBONG = 12; // the API's limit

/** Every 계급·호봉 the user actually went through, in order. */
function slotsOf(plan: ServicePlan): HobongSlot[] {
  return plan.periods.flatMap((p) =>
    Array.from(
      { length: Math.min(MAX_HOBONG, hobongOn(p.start, p.end)) },
      (_, i) => ({ rank: p.rank, hobong: i + 1 }),
    ),
  );
}

/**
 * 한마디 by 계급·호봉. A 현역 sees what seniors left for the 호봉 they are
 * in now and writes for the next people at it. A 예비역 picks any 호봉 they
 * went through and writes for the 후임 at it.
 */
export default function SeniorsCard({
  plan,
  mode,
}: {
  plan: ServicePlan;
  mode: "serving" | "reserve";
}) {
  const serving = mode === "serving";
  const slots = useMemo(() => slotsOf(plan), [plan]);
  const now = useMemo(() => {
    const at = rankHobongOn(plan, new Date());
    return at
      ? { rank: at.rank, hobong: Math.min(MAX_HOBONG, at.hobong) }
      : null;
  }, [plan]);
  const [picked, setPicked] = useState<HobongSlot>(slots[0]);
  const slot = serving ? now : picked;

  const { letters, isLoading, isError, refetch, add, remove, like } =
    useLetters(slot);
  const [expanded, setExpanded] = useState(false);
  const [writing, setWriting] = useState(false);

  if (!slot) return null;
  const label = `${slot.rank} ${slot.hobong}호봉`;
  const author: MemoryAuthor = {
    cohortMonth: cohortMonthOf(plan.enlist),
    branch: plan.branch,
    isReserve: !serving,
  };
  const shown = expanded ? letters : letters.slice(0, PREVIEW);
  const onError = (err: Error) => toast(err.message);

  return (
    <section className="flex flex-col gap-2.5 rounded-[18px] border-2 border-primary bg-card px-4 pb-3 pt-3">
      <h2>
        <button
          type="button"
          onClick={() => setWriting((v) => !v)}
          aria-expanded={writing}
          aria-controls="letter-composer"
          className="flex w-full items-start gap-2 text-left"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-[13.5px] font-bold text-primary">
              <MessageCircle
                className="size-[15px]"
                strokeWidth={2}
                aria-hidden="true"
              />
              {serving ? `${label}에 섰던 선배들` : "후임들에게 한마디"}
            </span>
            <span className="text-xs font-normal leading-normal text-muted-foreground">
              {serving
                ? "지금 나와 같은 호봉일 때 선배들이 남긴 한마디예요."
                : "남긴 한마디는 그 계급·호봉에 선 후임들에게 떠요."}
            </span>
          </span>
          <span
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary"
          >
            {writing ? (
              <X className="size-4" strokeWidth={2.2} />
            ) : (
              <PenLine className="size-3.5" strokeWidth={2.2} />
            )}
          </span>
          <span className="sr-only">
            {writing ? "쓰기 닫기" : "한마디 쓰기"}
          </span>
        </button>
      </h2>

      {!serving && writing && (
        <HobongPicker
          slots={slots}
          value={picked}
          onChange={(s) => {
            setPicked(s);
            setExpanded(false);
          }}
        />
      )}

      {writing && (
        <LetterComposer
          key={label}
          label={label}
          serving={serving}
          author={author}
          saving={add.isPending}
          onCancel={() => setWriting(false)}
          onSubmit={(body, done) =>
            add.mutate(
              { ...slot, body, author },
              {
                onSuccess: () => {
                  done();
                  setWriting(false);
                  toast("한마디를 남겼어요");
                },
                onError,
              },
            )
          }
        />
      )}

      {isLoading ? (
        <p className="py-3 text-center text-[13px] text-muted-foreground">
          불러오는 중…
        </p>
      ) : isError ? (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3.5 py-2.5 text-[13px] text-muted-foreground">
          한마디를 불러오지 못했어요.
          <button
            type="button"
            onClick={() => refetch()}
            className="h-8 rounded-lg border bg-card px-3 text-xs font-bold text-primary"
          >
            다시 시도
          </button>
        </div>
      ) : letters.length === 0 ? null : (
        <ul className="flex flex-col" aria-label={`${label}에 남겨진 한마디`}>
          {shown.map((m) => (
            <LetterRow
              key={m.id}
              letter={m}
              onLike={() => like.mutate(m.id, { onError })}
              onDelete={() => remove.mutate(m.id, { onError })}
            />
          ))}
        </ul>
      )}

      {letters.length > PREVIEW && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="h-9 rounded-xl border bg-card text-[12.5px] font-bold text-primary"
        >
          {expanded ? "접기" : `한마디 ${letters.length}개 모두 보기`}
        </button>
      )}
    </section>
  );
}

function HobongPicker({
  slots,
  value,
  onChange,
}: {
  slots: HobongSlot[];
  value: HobongSlot;
  onChange: (slot: HobongSlot) => void;
}) {
  const ranks = [...new Set(slots.map((s) => s.rank))];
  const hobongs = slots.filter((s) => s.rank === value.rank);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-4 gap-1" role="group" aria-label="계급">
        {ranks.map((rank) => (
          <button
            key={rank}
            type="button"
            aria-pressed={rank === value.rank}
            onClick={() => onChange({ rank, hobong: 1 })}
            className={cn(
              "h-9 rounded-xl border text-[13px] font-bold",
              rank === value.rank
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {rank}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1" role="group" aria-label="호봉">
        {hobongs.map((s) => (
          <button
            key={s.hobong}
            type="button"
            aria-pressed={s.hobong === value.hobong}
            onClick={() => onChange(s)}
            className={cn(
              "h-8 min-w-[52px] rounded-full border px-2.5 text-xs font-bold",
              s.hobong === value.hobong
                ? "border-primary bg-accent text-primary"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {s.hobong}호봉
          </button>
        ))}
      </div>
    </div>
  );
}

function LetterRow({
  letter: m,
  onLike,
  onDelete,
}: {
  letter: Memory;
  onLike: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex flex-col gap-1 border-t border-muted py-2.5 first:border-t-0 first:pt-0.5">
      <div className="flex items-center gap-1.5 text-[11px] text-ink-icon">
        <span>
          {cohortLabel(m.cohortMonth)} · {m.branch} ·{" "}
          {m.isReserve ? "예비역" : "현역"}
          {m.mine ? " · 내 글" : ""}
        </span>
        <span className="flex-1" />
        <span>{timeAgo(m.createdAt)}</span>
      </div>
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

function LetterComposer({
  label,
  serving,
  author,
  saving,
  onCancel,
  onSubmit,
}: {
  label: string;
  serving: boolean;
  author: MemoryAuthor;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (body: string, done: () => void) => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

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
      id="letter-composer"
      onSubmit={submit}
      className="flex flex-col gap-1.5 rounded-xl bg-background px-3 pb-2.5 pt-2.5"
    >
      <label htmlFor="letter-text" className="text-[12.5px] font-bold">
        {serving ? `다음 ${label}에게` : `${label} 후임에게`}
      </label>
      <p className="text-xs leading-normal text-muted-foreground">
        남기면 {label}이 된 후임들에게 따뜻한 메시지로 전해질 거예요.
      </p>
      <p className="flex items-center gap-1 text-[11px] font-bold text-destructive">
        <ShieldAlert className="size-3.5 shrink-0" aria-hidden="true" />
        부대명, 위치, 일정은 쓰지 말아주세요
      </p>
      <textarea
        id="letter-text"
        autoFocus
        value={text}
        maxLength={LETTER_MAX_LENGTH}
        rows={3}
        onChange={(e) => {
          setText(e.target.value);
          if (error) setError("");
        }}
        placeholder={
          serving
            ? "지금 제일 힘든 건 이거였어요. 그래도…"
            : "이 시기엔 이게 제일 힘들었는데, 지나고 보니…"
        }
        aria-invalid={!!error}
        aria-describedby="letter-help"
        className="min-h-[72px] resize-none rounded-xl border border-input bg-field px-3 py-2 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <div
        id="letter-help"
        className="flex items-center justify-between gap-2 text-[11px]"
      >
        {error ? (
          <span className="text-destructive">{error}</span>
        ) : (
          <span className="text-ink-icon">
            {cohortLabel(author.cohortMonth)} · {author.branch} ·{" "}
            {serving ? "현역" : "예비역"}으로 표시돼요
          </span>
        )}
        <span className="shrink-0 font-mono text-ink-icon">
          {text.length}/{LETTER_MAX_LENGTH}
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
