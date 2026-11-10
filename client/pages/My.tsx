import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { EyeOff, Heart, LogOut } from "lucide-react";
import { toast } from "sonner";
import ConfirmDelete from "@/components/ipdae/ConfirmDelete";
import MobileShell from "@/components/ipdae/MobileShell";
import SubHeader from "@/components/ipdae/SubHeader";
import { useMyPosts } from "@/hooks/useMyPosts";
import { clearSavedEnlistment } from "@/hooks/useSavedEnlistment";
import { type Memory, postContext, timeAgo } from "@/lib/memories";
import { cn } from "@/lib/utils";

type Tab = "posts" | "comments";

/** The 소통 thread a talk or reply belongs to. */
const threadOf = (m: Memory) =>
  m.kind === "talk" || m.kind === "post"
    ? m.id
    : m.kind === "reply"
      ? m.parentId
      : null;

/**
 * 내 활동: everything written from this device. 글 are 커뮤니티 글 and
 * 소통 글, 댓글 are memories left on songs and replies. Each can be
 * deleted here.
 */
export default function My() {
  const navigate = useNavigate();
  const { posts, isLoading, isError, refetch, remove } = useMyPosts();
  const [tab, setTab] = useState<Tab>("posts");
  const isComment = (p: Memory) => !!p.song || p.kind === "reply";
  const writings = posts.filter((p) => !isComment(p));
  const comments = posts.filter(isComment);
  const list = tab === "posts" ? writings : comments;

  // Asked in a dialog first (see ConfirmDelete)
  const [deleting, setDeleting] = useState<Memory | null>(null);
  const onDelete = (m: Memory) => setDeleting(m);
  const confirmDelete = () => {
    const m = deleting;
    setDeleting(null);
    if (!m) return;
    remove.mutate(m.id, {
      onSuccess: () => toast("지웠어요"),
      onError: (err) => toast(err.message),
    });
  };
  const reset = () => {
    clearSavedEnlistment();
    navigate("/", { replace: true });
  };

  return (
    <MobileShell>
      <SubHeader title="내 활동" />

      <div className="flex gap-1 px-4 pb-2" role="tablist" aria-label="내 활동">
        {(
          [
            ["posts", "내가 쓴 글", writings.length],
            ["comments", "내가 쓴 댓글", comments.length],
          ] as const
        ).map(([key, label, n]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              "h-9 flex-1 rounded-xl border text-[13px] font-bold",
              tab === key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {label}
            {!isLoading && <span className="ml-1 font-mono">{n}</span>}
          </button>
        ))}
      </div>
      <p className="px-4 pb-2 text-xs leading-normal text-ink-icon">
        {tab === "posts"
          ? "커뮤니티 글과 선후임 소통 글이에요."
          : "노래에 남긴 추억과 글에 단 댓글이에요."}{" "}
        이 기기에서 쓴 글만 보여요.
      </p>

      <main className="flex flex-1 flex-col px-4 pb-6">
        {isLoading ? (
          <p className="py-8 text-center text-[13px] text-muted-foreground">
            불러오는 중…
          </p>
        ) : isError ? (
          <div className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3.5 py-2.5 text-[13px] text-muted-foreground">
            내 글을 불러오지 못했어요.
            <button
              type="button"
              onClick={() => refetch()}
              className="h-8 rounded-lg border bg-card px-3 text-xs font-bold text-primary"
            >
              다시 시도
            </button>
          </div>
        ) : list.length === 0 ? (
          <p className="rounded-xl bg-muted px-4 py-6 text-center text-[13px] leading-relaxed text-muted-foreground">
            {tab === "posts"
              ? "아직 쓴 글이 없어요. 커뮤니티에서 남겨보세요."
              : "아직 쓴 댓글이 없어요. 차트에서 노래를 누르면 추억을 남길 수 있어요."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {list.map((m) => (
              <li
                key={m.id}
                className="flex flex-col gap-1 rounded-2xl border bg-card px-3.5 py-3"
              >
                <div className="flex items-center gap-2 text-[11.5px]">
                  {threadOf(m) ? (
                    <Link
                      to={`/talk/${threadOf(m)}`}
                      className="min-w-0 flex-1 truncate font-bold text-primary underline-offset-2 hover:underline"
                    >
                      {postContext(m)}
                      {m.kind === "talk" || m.kind === "post"
                        ? ` · 댓글 ${m.replies}`
                        : ""}{" "}
                      ›
                    </Link>
                  ) : (
                    <span className="min-w-0 flex-1 truncate font-bold text-primary">
                      {postContext(m)}
                    </span>
                  )}
                  <span className="shrink-0 text-ink-icon">
                    {timeAgo(m.createdAt)}
                  </span>
                </div>
                {m.hidden && (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-destructive">
                    <EyeOff className="size-3" aria-hidden="true" />
                    신고가 쌓여 다른 사람에게는 숨겨졌어요
                  </span>
                )}
                <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed">
                  {m.body}
                </p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span
                    className="flex items-center gap-1"
                    aria-label={`공감 ${m.likes}`}
                  >
                    <Heart
                      className="size-3.5"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    {m.likes}
                  </span>
                  <span className="flex-1" />
                  <button
                    type="button"
                    onClick={() => onDelete(m)}
                    disabled={remove.isPending}
                    className="h-8 rounded-lg px-1.5 text-xs text-muted-foreground hover:text-destructive"
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={reset}
          className="mt-6 flex h-11 items-center justify-center gap-1.5 rounded-xl border bg-card text-[13px] font-bold text-muted-foreground"
        >
          <LogOut className="size-4" strokeWidth={2} aria-hidden="true" />
          입대일 다시 입력하기
        </button>
        <p className="mt-2 text-center text-[11px] leading-relaxed text-ink-icon">
          브라우저 데이터를 지우면 이 기기에서 쓴 글을 더 이상 관리할 수 없어요.
        </p>
      </main>
      <ConfirmDelete
        what={deleting?.kind === "reply" ? "댓글" : "글"}
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </MobileShell>
  );
}
