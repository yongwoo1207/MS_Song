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
  TITLE_MAX_LENGTH,
  type MemoryAuthor,
  cohortLabel,
  cohortMonthOf,
} from "@/lib/memories";
import { TALK_MAX_LENGTH } from "@/lib/talks";
import { RANKS, type ServicePlan } from "@/lib/service";
import type { SongRef } from "@shared/posts";
import { cn } from "@/lib/utils";

const RANK_FILTERS = [...RANKS, "예비역"] as const;
type RankFilter = (typeof RANK_FILTERS)[number];

type Status = ReturnType<typeof ddayStatus>;

/**
 * 커뮤니티, two tabs:
 *  - 이야기 (/community): 커뮤니티 글 and memories left under songs, newest
 *    first, filtered by rank (which 시절 it is about) or to 예비역 only.
 *  - 선후임 소통 (/community/talk): 현역 and 예비역 write to each other and
 *    reply under each post. The home's 한마디 cards open this tab.
 */
export default function Community() {
  const { plan } = useServicePlan();
  const status = useMemo(() => (plan ? ddayStatus(plan) : null), [plan]);
  const { pathname, search } = useLocation();
  const talk = pathname.startsWith("/community/talk");

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
        <Tab to={`/community${search}`} on={!talk}>
          이야기
        </Tab>
        <Tab to={`/community/talk${search}`} on={talk}>
          선후임 소통
        </Tab>
      </nav>

      {talk ? (
        <TalkSpace plan={plan} status={status} search={search} />
      ) : (
        <StoryFeed plan={plan} status={status} search={search} />
      )}

      <BottomNav />
    </MobileShell>
  );
}

function authorOf(plan: ServicePlan, status: Status): MemoryAuthor {
  return {
    cohortMonth: cohortMonthOf(plan.enlist),
    branch: plan.branch,
    isReserve: status.status === "done",
  };
}

/** 이야기: 커뮤니티 글 and song memories. */
function StoryFeed({
  plan,
  status,
  search,
}: {
  plan: ServicePlan;
  status: Status;
  search: string;
}) {
  const [rank, setRank] = useState<RankFilter | null>(null);
  // The song memory being listened to
  const [song, setSong] = useState<SongRef | null>(null);
  const closeSong = useCallback(() => setSong(null), []);
  const [picker, setPicker] = useState(false);
  const feed = useCommunityFeed(rank);
  const [writing, setWriting] = useState(false);
  // Asked in a dialog first (see ConfirmDelete)
  const [deleting, setDeleting] = useState<string | null>(null);

  const canWrite = status.status !== "notYet";
  // A post carries the writer's rank now (none for 예비역)
  const myRank = status.status === "serving" ? status.current.rank : null;
  const author = authorOf(plan, status);
  const openComposer = () => {
    setWriting(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const note =
    rank === "예비역"
      ? "예비역이 쓴 글만 보여요."
      : rank
        ? `${rank} 때 쓴 글과 ${rank} 시절 노래 추억만 보여요.`
        : "모든 글과 노래 추억이 최신순으로 보여요. 노래를 누르면 들을 수 있어요.";
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
              hint={`${cohortLabel(author.cohortMonth)} · ${myRank ?? "예비역"}으로 표시돼요`}
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
            <h2 className="text-base font-bold">아직 올라온 글이 없어요</h2>
            <p className="text-[13.5px] leading-relaxed text-muted-foreground">
              그 시절 이야기를 처음으로 남겨보세요.
            </p>
          </section>
        ) : (
          <ul className="flex flex-col gap-2" aria-label="커뮤니티 글">
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
            그 계급 때 쓴 글과 그 시절 노래 추억만 보여요.
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
        what="글"
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const id = deleting;
          setDeleting(null);
          if (id)
            feed.remove.mutate(id, {
              onSuccess: () => toast("글을 지웠어요"),
              onError,
            });
        }}
      />
    </>
  );
}

const WHO = [
  { key: "all", label: "전체", reserve: undefined },
  { key: "reserve", label: "예비역 글", reserve: true },
  { key: "serving", label: "현역 글", reserve: false },
] as const;

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
  const [who, setWho] = useState<(typeof WHO)[number]>(WHO[0]);
  const talks = useTalks({ reserve: who.reserve });
  const [writing, setWriting] = useState(false);
  const reserve = status.status === "done";
  const canWrite = status.status !== "notYet";
  const author = authorOf(plan, status);
  const onError = (err: Error) => toast(err.message);
  const openComposer = () => {
    setWriting(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <p className="px-4 pb-2 pt-3 text-xs leading-normal text-ink-icon">
        {reserve
          ? "복무 중인 후임들에게 한마디 남기고, 그들의 이야기에 답해주세요."
          : canWrite
            ? "먼저 전역한 예비역 선배들에게 묻고 싶은 걸 남겨보세요."
            : "현역과 예비역이 서로 이야기 나누는 공간이에요. 입대하면 글을 쓸 수 있어요."}
      </p>

      <div
        className="flex flex-wrap gap-1.5 px-4 pb-2.5"
        role="group"
        aria-label="글쓴이 필터"
      >
        {WHO.map((w) => (
          <Chip key={w.key} on={who.key === w.key} onClick={() => setWho(w)}>
            {w.label}
          </Chip>
        ))}
      </div>

      <main className="flex flex-1 flex-col gap-2 px-4 pb-24">
        {writing && canWrite && (
          <section className="rounded-2xl border-2 border-primary bg-card px-3 pb-3 pt-3">
            <PostComposer
              id="talk-composer"
              label={reserve ? "현역 후임들에게" : "예비역 선배들에게"}
              hint={`${cohortLabel(author.cohortMonth)} · ${plan.branch} · ${
                status.status === "serving" ? status.current.rank : "예비역"
              }으로 표시돼요`}
              placeholder={
                reserve
                  ? "그때 이랬으면 좋았겠다 싶은 것, 응원 한마디…"
                  : "휴가, 보직, 전역 준비… 선배들에게 묻고 싶은 것"
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
                    rank:
                      status.status === "serving" ? status.current.rank : null,
                    author,
                  },
                  {
                    onSuccess: () => {
                      done();
                      setWriting(false);
                      if (who.reserve !== undefined && who.reserve !== reserve)
                        setWho(WHO[0]);
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
              {canWrite
                ? "첫 번째 이야기를 남겨보세요."
                : "선후임이 글을 남기면 여기에 보여요."}
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

      {!writing && canWrite && (
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
