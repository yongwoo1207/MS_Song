import { useCallback, useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Check, ChevronDown, MessagesSquare, PenLine } from "lucide-react";
import { toast } from "sonner";
import MobileShell from "@/components/ipdae/MobileShell";
import BottomNav from "@/components/ipdae/BottomNav";
import ConfirmDelete from "@/components/ipdae/ConfirmDelete";
import MemoryItem from "@/components/ipdae/MemoryItem";
import PostComposer from "@/components/ipdae/PostComposer";
import SongPlayer from "@/components/ipdae/SongPlayer";
import TalkItem from "@/components/ipdae/TalkItem";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useServicePlan } from "@/hooks/useServicePlan";
import { useCommunityFeed } from "@/hooks/useCommunityFeed";
import {
  type BoardTopic,
  TOPICS,
  WRITE_TOPICS,
  type WriteKind,
  kindLabel,
  topicOf,
} from "@/lib/boards";
import { dLabel, ddayStatus } from "@/lib/dday";
import {
  COMMUNITY_MAX_LENGTH,
  type FeedFilter,
  type Memory,
  TITLE_MAX_LENGTH,
  authorLine,
  writerOf,
} from "@/lib/memories";
import { TALK_MAX_LENGTH } from "@/lib/talks";
import { RANKS, type ServicePlan } from "@/lib/service";
import { FEED_TOPICS, type SongRef } from "@shared/posts";
import { cn } from "@/lib/utils";

const WRITER_FILTERS = [...RANKS, "예비역", "입대 예정"] as const;

type Status = ReturnType<typeof ddayStatus>;
type Who = "reserve" | "serving" | "pre";

/**
 * 커뮤니티: one board with everything, newest first: 이야기 (free posts),
 * 음악 (댓글 left under songs; tapping the song plays it) and 선후임 소통
 * (현역, 예비역 and 입대 예정자 asking each other). Topic chips narrow it,
 * each with its own address (/community/music …) so home cards can link
 * to one; topics are listed in lib/boards.ts. A 계급 chip narrows by who
 * wrote it.
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
        ? "예비역"
        : "입대 전";

  return (
    <MobileShell>
      <header className="flex flex-col gap-px border-b px-5 pb-3 pt-4">
        <span className="font-mono text-[11px] text-ink-icon">{me}</span>
        <h1 className="text-lg font-bold">커뮤니티</h1>
      </header>
      {/* Keyed so the 글쓰기 box starts on this topic's 말머리 */}
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

function filterNote(filter: FeedFilter) {
  if (filter === "예비역") return "예비역이 쓴 것만 보여요.";
  if (filter === "입대 예정") return "입대 예정자가 쓴 것만 보여요.";
  return `${filter} 때 쓴 글과 ${filter} 시절 노래 댓글만 보여요.`;
}

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
  const [filter, setFilter] = useState<FeedFilter>(null);
  const [picker, setPicker] = useState(false);
  const feed = useCommunityFeed(topic.key, filter);
  // The song memory being listened to
  const [song, setSong] = useState<SongRef | null>(null);
  const closeSong = useCallback(() => setSong(null), []);
  const [writing, setWriting] = useState(false);
  const [kind, setKind] = useState<WriteKind>(topic.writes);
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
    kind === "post"
      ? "생활관 이야기, 요즘 듣는 노래, 하고 싶은 말…"
      : who === "reserve"
        ? "후임들에게: 그때 이랬으면 좋았겠다 싶은 것, 응원 한마디…"
        : who === "serving"
          ? "선배들에게: 휴가, 보직, 전역 준비… 묻고 싶은 것"
          : "선배들에게: 훈련소 준비물, 첫 휴가… 입대 전에 궁금한 것";

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
        <span aria-hidden="true" className="mx-0.5 my-2 w-px bg-border" />
        <Chip on={!!filter} onClick={() => setPicker(true)} hasMenu>
          {filter ?? "계급"}
        </Chip>
      </div>

      <p className="px-4 pb-2 text-xs leading-normal text-ink-icon">
        {filter ? filterNote(filter) : topic.note}
      </p>

      <main className="flex flex-1 flex-col gap-2 px-4 pb-24">
        {writing && (
          <section className="flex flex-col gap-2 rounded-2xl border-2 border-primary bg-card px-3 pb-3 pt-3">
            <div className="flex gap-1.5 px-1" role="group" aria-label="말머리">
              {WRITE_TOPICS.map((w) => (
                <Chip
                  key={w.kind}
                  on={kind === w.kind}
                  onClick={() => setKind(w.kind)}
                >
                  {w.label}
                </Chip>
              ))}
            </div>
            <PostComposer
              id="community-composer"
              label={kind === "post" ? "이야기" : "선후임 소통"}
              hint={`${authorLine({ ...author, rank: rankNow(status) })}으로 표시돼요`}
              titleMaxLength={TITLE_MAX_LENGTH}
              titlePlaceholder="제목"
              placeholder={placeholder}
              maxLength={
                kind === "post" ? COMMUNITY_MAX_LENGTH : TALK_MAX_LENGTH
              }
              submitLabel="올리기"
              saving={feed.add.isPending}
              onCancel={() => setWriting(false)}
              onSubmit={(body, done, title) =>
                feed.add.mutate(
                  { kind, title, body, rank: rankNow(status), author },
                  {
                    onSuccess: () => {
                      done();
                      setWriting(false);
                      setFilter(null);
                      // Show it: move to 전체 when this topic doesn't list it
                      const kinds: readonly string[] = FEED_TOPICS[topic.key];
                      if (!kinds.includes(kind)) goTopic(TOPICS[0]);
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
                // 이야기 and 소통 글 open into their page with 댓글
                <TalkItem
                  key={m.id}
                  talk={m}
                  search={search}
                  label={topic.key === "all" ? kindLabel(m.kind) : null}
                />
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

      <Drawer open={picker} onOpenChange={setPicker}>
        <DrawerContent className="mx-auto max-w-[430px] px-4 pb-8">
          <DrawerTitle className="pt-4 text-base">계급 선택</DrawerTitle>
          <DrawerDescription className="pb-3 text-xs">
            그 계급 때 쓴 글과 그 시절 노래 댓글만 보여요.
          </DrawerDescription>
          <ul className="flex flex-col gap-1.5">
            {WRITER_FILTERS.map((r) => (
              <PickerRow
                key={r}
                on={filter === r}
                onClick={() => {
                  setFilter(filter === r ? null : r);
                  setPicker(false);
                }}
              >
                {r}
              </PickerRow>
            ))}
          </ul>
        </DrawerContent>
      </Drawer>

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
  hasMenu,
  children,
}: {
  on: boolean;
  onClick: () => void;
  hasMenu?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={hasMenu ? undefined : on}
      aria-haspopup={hasMenu ? "dialog" : undefined}
      className={cn(
        "flex h-[34px] items-center gap-1 whitespace-nowrap rounded-full border px-3.5 text-[12.5px] font-bold",
        on
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground",
      )}
    >
      {children}
      {hasMenu && (
        <ChevronDown
          className="size-3.5"
          strokeWidth={2.4}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function PickerRow({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={on}
        className={cn(
          "flex h-12 w-full items-center gap-2.5 rounded-xl border px-3.5 text-left text-[15px] font-bold",
          on ? "border-primary bg-accent" : "border-border bg-card",
        )}
      >
        <span className="flex flex-1 items-center gap-2.5">{children}</span>
        {on && (
          <Check
            className="size-[18px] text-primary"
            strokeWidth={2.4}
            aria-hidden="true"
          />
        )}
      </button>
    </li>
  );
}
