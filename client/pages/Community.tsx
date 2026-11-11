import { useCallback, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { MessagesSquare, PenLine } from "lucide-react";
import { toast } from "sonner";
import MobileShell from "@/components/ipdae/MobileShell";
import BottomNav from "@/components/ipdae/BottomNav";
import ConfirmDelete from "@/components/ipdae/ConfirmDelete";
import MemoryItem from "@/components/ipdae/MemoryItem";
import PostComposer from "@/components/ipdae/PostComposer";
import SongPlayer from "@/components/ipdae/SongPlayer";
import TalkItem from "@/components/ipdae/TalkItem";
import { useServicePlan } from "@/hooks/useServicePlan";
import { useCommunityFeed } from "@/hooks/useCommunityFeed";
import { type BoardTopic, TOPICS, topicOf } from "@/lib/boards";
import { dLabel, ddayStatus } from "@/lib/dday";
import {
  COMMUNITY_MAX_LENGTH,
  type Memory,
  TITLE_MAX_LENGTH,
  authorLine,
  writerOf,
} from "@/lib/memories";
import type { ServicePlan } from "@/lib/service";
import type { SongRef } from "@shared/posts";
import { cn } from "@/lib/utils";

type Status = ReturnType<typeof ddayStatus>;
type Who = "reserve" | "serving" | "pre";

/**
 * 커뮤니티: one board with everything, newest first: 글 (현역, 예비역 and
 * 입대 예정자 write and 댓글 under each other's) and 음악 (댓글 left under
 * songs; tapping the song plays it). Topic chips narrow it, each with its
 * own address (/community/music); topics are listed in lib/boards.ts.
 * Older 선후임 소통 글 (kind talk) still show as 글.
 */
export default function Community() {
  const { plan } = useServicePlan();
  const status = useMemo(() => (plan ? ddayStatus(plan) : null), [plan]);
  const { pathname } = useLocation();
  const topic = topicOf(pathname);

  if (!plan || !status) return <Navigate to="/" replace />;

  const me =
    status.status === "serving"
      ? `${status.current.rank} · ${dLabel(status.daysLeft)}`
      : status.status === "done"
        ? status.reserve.kind === "민방위"
          ? "민방위"
          : "예비역"
        : "입대 전";

  return (
    <MobileShell>
      <header className="flex flex-col gap-px border-b px-5 pb-3 pt-4">
        <span className="font-mono text-[11px] text-ink-icon">{me}</span>
        <h1 className="text-lg font-bold">커뮤니티</h1>
      </header>
      {/* Keyed so each topic starts with a closed 글쓰기 box */}
      <Board key={topic.key} topic={topic} plan={plan} status={status} />
      <BottomNav />
    </MobileShell>
  );
}

/** A rank of 현역 now, null for 예비역 and 입대 예정자. */
const rankNow = (status: Status) =>
  status.status === "serving" ? status.current.rank : null;

const whoOf = (status: Status): Who =>
  status.status === "done"
    ? "reserve"
    : status.status === "serving"
      ? "serving"
      : "pre";

function Board({
  topic,
  plan,
  status,
}: {
  topic: BoardTopic;
  plan: ServicePlan;
  status: Status;
}) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const feed = useCommunityFeed(topic.key);
  // The song memory being listened to
  const [song, setSong] = useState<SongRef | null>(null);
  const closeSong = useCallback(() => setSong(null), []);
  const [writing, setWriting] = useState(false);
  // Asked in a dialog first (see ConfirmDelete)
  const [deleting, setDeleting] = useState<Memory | null>(null);

  const author = writerOf(plan);
  const who = whoOf(status);
  const onError = (err: Error) => toast(err.message);
  const openComposer = () => {
    setWriting(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goTopic = (t: BoardTopic) =>
    navigate(`${t.path}${search}`, { replace: true });

  const placeholder =
    who === "reserve"
      ? "후임들에게 한마디, 그 시절 이야기, 요즘 듣는 노래…"
      : who === "serving"
        ? "생활관 이야기, 선배들에게 묻고 싶은 것…"
        : "훈련소 준비물, 첫 휴가… 입대 전에 궁금한 것";

  return (
    <>
      {song && <SongPlayer song={song} onClose={closeSong} />}
      <div
        className="flex flex-wrap gap-1.5 px-4 pb-2 pt-3"
        role="group"
        aria-label="주제"
      >
        {TOPICS.map((t) => (
          <Chip key={t.key} on={t.key === topic.key} onClick={() => goTopic(t)}>
            {t.label}
          </Chip>
        ))}
      </div>

      <p className="px-4 pb-2 text-xs leading-normal text-ink-icon">
        {topic.note}
      </p>

      <main className="flex flex-1 flex-col gap-2 px-4 pb-24">
        {writing && (
          <section className="flex flex-col gap-2 rounded-2xl border-2 border-primary bg-card px-3 pb-3 pt-3">
            <PostComposer
              id="community-composer"
              label="글쓰기"
              hint={`${authorLine({ ...author, rank: rankNow(status) })}으로 표시돼요`}
              titleMaxLength={TITLE_MAX_LENGTH}
              titlePlaceholder="제목"
              placeholder={placeholder}
              maxLength={COMMUNITY_MAX_LENGTH}
              submitLabel="올리기"
              saving={feed.add.isPending}
              onCancel={() => setWriting(false)}
              onSubmit={(body, done, title) =>
                feed.add.mutate(
                  {
                    kind: "post",
                    title,
                    body,
                    rank: rankNow(status),
                    author,
                  },
                  {
                    onSuccess: () => {
                      done();
                      setWriting(false);
                      // Show it: 음악 lists only 노래 댓글
                      if (topic.key !== "all") goTopic(TOPICS[0]);
                      toast("글을 올렸어요");
                    },
                    onError,
                  },
                )
              }
            />
          </section>
        )}
        {feed.isLoading ? (
          <p className="py-10 text-center text-[13px] text-muted-foreground">
            불러오는 중…
          </p>
        ) : feed.isError ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card px-6 py-8 text-center text-[13.5px] text-muted-foreground">
            글을 불러오지 못했어요.
            <button
              type="button"
              onClick={() => feed.refetch()}
              className="h-9 rounded-xl border bg-card px-4 text-[13px] font-bold text-primary"
            >
              다시 시도
            </button>
          </div>
        ) : feed.posts.length === 0 ? (
          <section className="flex flex-col items-center gap-2.5 rounded-2xl border bg-card px-6 py-10 text-center">
            <span
              aria-hidden="true"
              className="flex size-14 items-center justify-center rounded-full bg-accent text-primary"
            >
              <MessagesSquare className="size-6" strokeWidth={2} />
            </span>
            <h2 className="text-base font-bold">아직 올라온 글이 없어요</h2>
            <p className="text-[13.5px] leading-relaxed text-muted-foreground">
              {topic.empty}
            </p>
          </section>
        ) : (
          <ul className="flex flex-col gap-2" aria-label="커뮤니티 글">
            {feed.posts.map((m) =>
              m.kind === "record" ? (
                <MemoryItem
                  key={m.id}
                  memory={m}
                  showSong
                  onPlay={m.song ? () => setSong(m.song) : undefined}
                  onLike={() => feed.like.mutate(m.id, { onError })}
                  onDelete={() => setDeleting(m)}
                />
              ) : (
                // 글 open into their page with 댓글
                <TalkItem key={m.id} talk={m} search={search} />
              ),
            )}
            {feed.hasMore && (
              <li>
                <button
                  type="button"
                  onClick={() =>
                    feed.loadMore().catch(() => toast("더 불러오지 못했어요"))
                  }
                  disabled={feed.loadingMore}
                  className="h-10 w-full rounded-xl border bg-card text-[13px] font-bold text-primary disabled:opacity-60"
                >
                  {feed.loadingMore ? "불러오는 중…" : "더 보기"}
                </button>
              </li>
            )}
          </ul>
        )}
      </main>

      {!writing && (
        <WriteButton onClick={openComposer} controls="community-composer" />
      )}

      <ConfirmDelete
        what={deleting?.kind === "record" ? "댓글" : "글"}
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const m = deleting;
          setDeleting(null);
          if (m)
            feed.remove.mutate(m.id, {
              onSuccess: () => toast("지웠어요"),
              onError,
            });
        }}
      />
    </>
  );
}

function WriteButton({
  onClick,
  controls,
}: {
  onClick: () => void;
  controls: string;
}) {
  return (
    <div className="pointer-events-none sticky bottom-[calc(56px+max(env(safe-area-inset-bottom),6px))] z-10 flex justify-end px-4 pb-3">
      <button
        type="button"
        onClick={onClick}
        aria-controls={controls}
        className="pointer-events-auto flex h-10 items-center gap-1 rounded-full bg-primary pl-3 pr-3.5 text-[13px] font-bold text-primary-foreground shadow-[0_4px_14px_rgba(26,29,22,0.18)]"
      >
        <PenLine className="size-3.5" strokeWidth={2.4} aria-hidden="true" />
        글쓰기
      </button>
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "flex h-[34px] items-center gap-1 whitespace-nowrap rounded-full border px-3.5 text-[12.5px] font-bold",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
