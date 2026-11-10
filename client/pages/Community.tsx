import { useCallback, useMemo, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
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
import { useTalks } from "@/hooks/useTalks";
import { dLabel, ddayStatus } from "@/lib/dday";
import {
  COMMUNITY_MAX_LENGTH,
  type FeedTopic,
  TITLE_MAX_LENGTH,
  authorLine,
  writerOf,
} from "@/lib/memories";
import { TALK_MAX_LENGTH, type TalkWho } from "@/lib/talks";
import { RANKS, type ServicePlan } from "@/lib/service";
import type { SongRef } from "@shared/posts";
import { cn } from "@/lib/utils";

const RANK_FILTERS = [...RANKS, "예비역"] as const;
type RankFilter = (typeof RANK_FILTERS)[number];

type Status = ReturnType<typeof ddayStatus>;

/**
 * 커뮤니티, three tabs:
 *  - 이야기 (/community): 커뮤니티 글, free posts that open into their 댓글.
 *  - 음악 (/community/music): memories (댓글) left under songs; tapping the
 *    song plays it.
 *  - 선후임 소통 (/community/talk): 현역, 예비역 and 입대 예정자 write to
 *    each other. The home's 한마디 cards open this tab.
 * The first two filter by rank or to 예비역 only. 입대 예정자 write too,
 * shown as "입대 23일 전".
 */
export default function Community() {
  const { plan } = useServicePlan();
  const status = useMemo(() => (plan ? ddayStatus(plan) : null), [plan]);
  const { pathname, search } = useLocation();
  const tab = pathname.startsWith("/community/talk")
    ? "talk"
    : pathname.startsWith("/community/music")
      ? "music"
      : "story";

  if (!plan || !status) return <Navigate to="/" replace />;

  const me =
    status.status === "serving"
      ? `${status.current.rank} · ${dLabel(status.daysLeft)}`
      : status.status === "done"
        ? "예비역"
        : "입대 전";

  return (
    <MobileShell>
      <header className="flex flex-col gap-px px-5 pb-2 pt-4">
        <span className="font-mono text-[11px] text-ink-icon">{me}</span>
        <h1 className="text-lg font-bold">커뮤니티</h1>
      </header>

      <nav className="flex gap-4 border-b px-5" aria-label="커뮤니티 탭">
        <Tab to={`/community${search}`} on={tab === "story"}>
          이야기
        </Tab>
        <Tab to={`/community/music${search}`} on={tab === "music"}>
          음악
        </Tab>
        <Tab to={`/community/talk${search}`} on={tab === "talk"}>
          선후임 소통
        </Tab>
      </nav>

      {tab === "talk" ? (
        <TalkSpace plan={plan} status={status} search={search} />
      ) : (
        // Keyed so each board keeps its own filter and player
        <Board
          key={tab}
          topic={tab}
          plan={plan}
          status={status}
          search={search}
        />
      )}

      <BottomNav />
    </MobileShell>
  );
}

/** A rank of 현역 now, null for 예비역 and 입대 예정자. */
const rankNow = (status: Status) =>
  status.status === "serving" ? status.current.rank : null;

/** 이야기 (커뮤니티 글, written here) or 음악 (memories under songs). */
function Board({
  topic,
  plan,
  status,
  search,
}: {
  topic: FeedTopic;
  plan: ServicePlan;
  status: Status;
  search: string;
}) {
  const music = topic === "music";
  const [rank, setRank] = useState<RankFilter | null>(null);
  // The song memory being listened to
  const [song, setSong] = useState<SongRef | null>(null);
  const closeSong = useCallback(() => setSong(null), []);
  const [picker, setPicker] = useState(false);
  const feed = useCommunityFeed(topic, rank);
  const [writing, setWriting] = useState(false);
  // Asked in a dialog first (see ConfirmDelete)
  const [deleting, setDeleting] = useState<string | null>(null);

  // 음악 is written from the song screens (입대곡 · 타임라인 player)
  const canWrite = !music;
  // A post carries the writer's rank now (none for 예비역, 입대 예정자)
  const myRank = rankNow(status);
  const author = writerOf(plan);
  const openComposer = () => {
    setWriting(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const note = music
    ? rank === "예비역"
      ? "예비역이 노래에 남긴 댓글만 보여요."
      : rank
        ? `${rank} 시절 노래에 남긴 댓글만 보여요.`
        : "노래에 남긴 댓글이 최신순으로 모여요. 노래를 누르면 들을 수 있어요."
    : rank === "예비역"
      ? "예비역이 쓴 글만 보여요."
      : rank
        ? `${rank} 때 쓴 글만 보여요.`
        : "자유롭게 쓴 글이 최신순으로 보여요. 누르면 댓글을 볼 수 있어요.";
  const onError = (err: Error) => toast(err.message);

  return (
    <>
      {song && <SongPlayer song={song} onClose={closeSong} />}
      <div
        className="flex flex-wrap gap-1.5 px-4 pb-2.5 pt-3"
        role="group"
        aria-label="글 필터"
      >
        <Chip on={!rank} onClick={() => setRank(null)}>
          전체
        </Chip>
        <Chip on={!!rank} onClick={() => setPicker(true)} hasMenu>
          {rank ?? "계급"}
        </Chip>
      </div>

      <p className="px-4 pb-2 text-xs leading-normal text-ink-icon">{note}</p>

      <main className="flex flex-1 flex-col gap-2 px-4 pb-24">
        {writing && canWrite && (
          <section className="rounded-2xl border-2 border-primary bg-card px-3 pb-3 pt-3">
            <PostComposer
              id="community-composer"
              label="자유글"
              hint={`${authorLine({ ...author, rank: myRank })}으로 표시돼요`}
              titleMaxLength={TITLE_MAX_LENGTH}
              titlePlaceholder="제목"
              placeholder="생활관 이야기, 요즘 듣는 노래, 하고 싶은 말…"
              maxLength={COMMUNITY_MAX_LENGTH}
              submitLabel="올리기"
              saving={feed.add.isPending}
              onCancel={() => setWriting(false)}
              onSubmit={(body, done, title) =>
                feed.add.mutate(
                  { title, body, rank: myRank, author },
                  {
                    onSuccess: () => {
                      done();
                      setWriting(false);
                      setRank(null);
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
            <h2 className="text-base font-bold">
              {music
                ? "아직 노래에 남긴 댓글이 없어요"
                : "아직 올라온 글이 없어요"}
            </h2>
            <p className="text-[13.5px] leading-relaxed text-muted-foreground">
              {music
                ? "입대곡이나 타임라인에서 노래를 틀고 댓글을 남겨보세요."
                : "첫 번째 이야기를 남겨보세요."}
            </p>
          </section>
        ) : (
          <ul
            className="flex flex-col gap-2"
            aria-label={music ? "노래 댓글" : "커뮤니티 글"}
          >
            {feed.posts.map((m) =>
              m.kind === "post" ? (
                // 커뮤니티 글 open into their page with 댓글
                <TalkItem key={m.id} talk={m} search={search} />
              ) : (
                <MemoryItem
                  key={m.id}
                  memory={m}
                  showSong
                  onPlay={m.song ? () => setSong(m.song) : undefined}
                  onLike={() => feed.like.mutate(m.id, { onError })}
                  onDelete={() => setDeleting(m.id)}
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

      {!writing && canWrite && (
        <WriteButton onClick={openComposer} controls="community-composer" />
      )}

      <Drawer open={picker} onOpenChange={setPicker}>
        <DrawerContent className="mx-auto max-w-[430px] px-4 pb-8">
          <DrawerTitle className="pt-4 text-base">계급 선택</DrawerTitle>
          <DrawerDescription className="pb-3 text-xs">
            {music
              ? "그 계급 시절 노래에 남긴 댓글만 보여요."
              : "그 계급 때 쓴 글만 보여요."}
          </DrawerDescription>
          <ul className="flex flex-col gap-1.5">
            {RANK_FILTERS.map((r) => (
              <PickerRow
                key={r}
                on={rank === r}
                onClick={() => {
                  setRank(rank === r ? null : r);
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
        what={music ? "댓글" : "글"}
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const id = deleting;
          setDeleting(null);
          if (id)
            feed.remove.mutate(id, {
              onSuccess: () => toast("지웠어요"),
              onError,
            });
        }}
      />
    </>
  );
}

const WHO: { key: TalkWho | "all"; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "reserve", label: "예비역 글" },
  { key: "serving", label: "현역 글" },
  { key: "pre", label: "입대 예정 글" },
];

/** 선후임 소통: 현역 and 예비역 talk to each other. */
function TalkSpace({
  plan,
  status,
  search,
}: {
  plan: ServicePlan;
  status: Status;
  search: string;
}) {
  const [who, setWho] = useState<TalkWho | "all">("all");
  const talks = useTalks({ who: who === "all" ? undefined : who });
  const [writing, setWriting] = useState(false);
  const mine: TalkWho =
    status.status === "done"
      ? "reserve"
      : status.status === "serving"
        ? "serving"
        : "pre";
  const author = writerOf(plan);
  const onError = (err: Error) => toast(err.message);
  const openComposer = () => {
    setWriting(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <p className="px-4 pb-2 pt-3 text-xs leading-normal text-ink-icon">
        {mine === "reserve"
          ? "복무 중인 후임들에게 한마디 남기고, 그들의 이야기에 답해주세요."
          : mine === "serving"
            ? "먼저 전역한 예비역 선배들에게 묻고 싶은 걸 남겨보세요."
            : "입대를 앞두고 궁금한 걸 먼저 다녀온 선배들에게 물어보세요."}
      </p>

      <div
        className="flex flex-wrap gap-1.5 px-4 pb-2.5"
        role="group"
        aria-label="글쓴이 필터"
      >
        {WHO.map((w) => (
          <Chip key={w.key} on={who === w.key} onClick={() => setWho(w.key)}>
            {w.label}
          </Chip>
        ))}
      </div>

      <main className="flex flex-1 flex-col gap-2 px-4 pb-24">
        {writing && (
          <section className="rounded-2xl border-2 border-primary bg-card px-3 pb-3 pt-3">
            <PostComposer
              id="talk-composer"
              label={mine === "reserve" ? "현역 후임들에게" : "선배들에게"}
              hint={`${authorLine({ ...author, rank: rankNow(status) })}으로 표시돼요`}
              placeholder={
                mine === "reserve"
                  ? "그때 이랬으면 좋았겠다 싶은 것, 응원 한마디…"
                  : mine === "serving"
                    ? "휴가, 보직, 전역 준비… 선배들에게 묻고 싶은 것"
                    : "훈련소 준비물, 첫 휴가… 입대 전에 궁금한 것"
              }
              titleMaxLength={TITLE_MAX_LENGTH}
              titlePlaceholder="제목"
              maxLength={TALK_MAX_LENGTH}
              submitLabel="올리기"
              saving={talks.ask.isPending}
              autoFocus
              onCancel={() => setWriting(false)}
              onSubmit={(body, done, title) =>
                talks.ask.mutate(
                  {
                    title,
                    body,
                    rank: rankNow(status),
                    author,
                  },
                  {
                    onSuccess: () => {
                      done();
                      setWriting(false);
                      if (who !== "all" && who !== mine) setWho("all");
                      toast("글을 올렸어요");
                    },
                    onError,
                  },
                )
              }
            />
          </section>
        )}
        {talks.isLoading ? (
          <p className="py-10 text-center text-[13px] text-muted-foreground">
            불러오는 중…
          </p>
        ) : talks.isError ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card px-6 py-8 text-center text-[13.5px] text-muted-foreground">
            글을 불러오지 못했어요.
            <button
              type="button"
              onClick={() => talks.refetch()}
              className="h-9 rounded-xl border bg-card px-4 text-[13px] font-bold text-primary"
            >
              다시 시도
            </button>
          </div>
        ) : talks.talks.length === 0 ? (
          <section className="flex flex-col items-center gap-2.5 rounded-2xl border bg-card px-6 py-10 text-center">
            <span
              aria-hidden="true"
              className="flex size-14 items-center justify-center rounded-full bg-accent text-primary"
            >
              <MessagesSquare className="size-6" strokeWidth={2} />
            </span>
            <h2 className="text-base font-bold">아직 올라온 글이 없어요</h2>
            <p className="text-[13.5px] leading-relaxed text-muted-foreground">
              첫 번째 이야기를 남겨보세요.
            </p>
          </section>
        ) : (
          <ul className="flex flex-col gap-2" aria-label="선후임 소통 글">
            {talks.talks.map((m) => (
              <TalkItem key={m.id} talk={m} search={search} />
            ))}
            {talks.hasMore && (
              <li>
                <button
                  type="button"
                  onClick={() =>
                    talks.loadMore().catch(() => toast("더 불러오지 못했어요"))
                  }
                  disabled={talks.loadingMore}
                  className="h-10 w-full rounded-xl border bg-card text-[13px] font-bold text-primary disabled:opacity-60"
                >
                  {talks.loadingMore ? "불러오는 중…" : "더 보기"}
                </button>
              </li>
            )}
          </ul>
        )}
      </main>

      {!writing && (
        <WriteButton onClick={openComposer} controls="talk-composer" />
      )}
    </>
  );
}

function Tab({
  to,
  on,
  children,
}: {
  to: string;
  on: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      replace
      aria-current={on ? "page" : undefined}
      className={cn(
        "-mb-px border-b-2 pb-2 pt-1 text-[14.5px] font-bold",
        on
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground",
      )}
    >
      {children}
    </Link>
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
