import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useDragToClose } from "@/hooks/useDragToClose";
import { useMemories } from "@/hooks/useMemories";
import type { PostRank, SongRef } from "@shared/posts";
import {
  MEMORY_MAX_LENGTH,
  type MemoryAuthor,
  cohortLabel,
  preEnlistLabel,
} from "@/lib/memories";
import MemoryItem from "./MemoryItem";

interface MemoriesPanelProps {
  song: SongRef;
  /** The rank tab the song was played from: "일병 시절" */
  rank: PostRank;
  /** 'YYYY-MM' chart month the memory is about */
  aboutMonth: string;
  author: MemoryAuthor;
  onClose: () => void;
}

/**
 * Bottom panel with people's memories of the playing song and a box to add
 * one. It stops below the pinned video so the player stays visible.
 */
export default function MemoriesPanel({
  song,
  rank,
  aboutMonth,
  author,
  onClose,
}: MemoriesPanelProps) {
  const {
    memories,
    isLoading,
    isError,
    refetch,
    hasMore,
    loadingMore,
    loadMore,
    add,
    remove,
    like,
  } = useMemories(song.key);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const handleRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useDragToClose(panelRef, handleRef, listRef, onClose);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("내용을 입력해주세요");
      return;
    }
    add.mutate(
      { song, body: text, rank, aboutMonth, author },
      {
        onSuccess: () => {
          setText("");
          toast("추억을 남겼어요");
        },
        onError: (err) =>
          setError(err instanceof Error ? err.message : "저장하지 못했어요"),
      },
    );
  };

  // Portal: the sticky player is its own stacking context, so rendering
  // inside it would leave the bottom nav painted over the composer.
  return createPortal(
    <section
      ref={panelRef}
      role="dialog"
      aria-label={`${song.title} 추억`}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[max(260px,calc(100dvh-310px))] w-full max-w-[430px] flex-col rounded-t-3xl border-t bg-background shadow-[0_-8px_24px_rgba(26,29,22,0.12)] duration-200 animate-in slide-in-from-bottom"
    >
      <header
        ref={handleRef}
        className="relative flex cursor-grab touch-none select-none items-start gap-2 px-4 pb-2 pt-5"
      >
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-2 h-1 w-9 -translate-x-1/2 rounded-full bg-border"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="truncate text-[15px] font-bold">이 노래의 추억</h2>
          <span className="truncate text-xs text-muted-foreground">
            {song.title} · {song.artist}
          </span>
        </div>
        <button
          ref={closeRef}
          type="button"
          aria-label="추억 닫기"
          onClick={onClose}
          className="-mr-1.5 -mt-1 flex size-10 shrink-0 items-center justify-center text-muted-foreground"
        >
          <X className="size-5" strokeWidth={2} />
        </button>
      </header>

      <div
        ref={listRef}
        className="min-h-0 flex-1 overscroll-contain overflow-y-auto px-4"
      >
        {isLoading ? (
          <p className="py-6 text-center text-[13px] text-muted-foreground">
            불러오는 중…
          </p>
        ) : isError ? (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-muted px-4 py-5 text-center text-[13px] text-muted-foreground">
            추억을 불러오지 못했어요.
            <button
              type="button"
              onClick={() => refetch()}
              className="h-9 rounded-lg border bg-card px-3 text-xs font-bold text-primary"
            >
              다시 시도
            </button>
          </div>
        ) : memories.length === 0 ? (
          <p className="rounded-xl bg-muted px-4 py-5 text-center text-[13px] leading-relaxed text-muted-foreground">
            아직 이 노래의 추억이 없어요.
            <br />이 노래를 들으면 떠오르는 순간을 처음으로 남겨보세요.
          </p>
        ) : (
          <ul className="flex flex-col gap-2 pb-2">
            {memories.map((m) => (
              <MemoryItem
                key={m.id}
                memory={m}
                onLike={() =>
                  like.mutate(m.id, {
                    onError: (err) => toast(err.message),
                  })
                }
                onDelete={() =>
                  remove.mutate(m.id, {
                    onError: (err) => toast(err.message),
                  })
                }
              />
            ))}
            {hasMore && (
              <li>
                <button
                  type="button"
                  onClick={() =>
                    loadMore().catch(() => toast("더 불러오지 못했어요"))
                  }
                  disabled={loadingMore}
                  className="h-10 w-full rounded-xl border bg-card text-[13px] font-bold text-primary disabled:opacity-60"
                >
                  {loadingMore ? "불러오는 중…" : "더 보기"}
                </button>
              </li>
            )}
          </ul>
        )}
      </div>

      <form
        onSubmit={submit}
        className="flex flex-col gap-1.5 border-t bg-card px-4 pb-[max(env(safe-area-inset-bottom),12px)] pt-2.5"
      >
        <label htmlFor="memory-text" className="sr-only">
          내 추억 쓰기
        </label>
        <div className="flex items-end gap-2">
          <textarea
            id="memory-text"
            value={text}
            maxLength={MEMORY_MAX_LENGTH}
            rows={2}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError("");
            }}
            placeholder="훈련소 퇴소 날 버스에서 처음 들었어요"
            aria-invalid={!!error}
            aria-describedby="memory-help"
            className="min-h-[52px] flex-1 resize-none rounded-xl border border-input bg-field px-3 py-2 text-sm leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <button
            type="submit"
            disabled={add.isPending}
            className="h-[52px] shrink-0 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            남기기
          </button>
        </div>
        <div
          id="memory-help"
          className="flex items-center justify-between gap-2 text-[11px]"
        >
          {error ? (
            <span className="text-destructive">{error}</span>
          ) : (
            <span className="text-ink-icon">
              {author.daysToEnlist != null
                ? `${preEnlistLabel(author.daysToEnlist)}으로 표시돼요`
                : `${cohortLabel(author.cohortMonth)} · ${rank} 시절${author.isReserve ? " · 예비역으로" : "로"} 표시돼요`}
            </span>
          )}
          <span className="shrink-0 font-mono text-ink-icon">
            {text.length}/{MEMORY_MAX_LENGTH}
          </span>
        </div>
      </form>
    </section>,
    document.body,
  );
}
