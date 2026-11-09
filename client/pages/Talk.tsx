import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import ConfirmDelete from "@/components/ipdae/ConfirmDelete";
import MobileShell from "@/components/ipdae/MobileShell";
import PostComposer from "@/components/ipdae/PostComposer";
import SubHeader from "@/components/ipdae/SubHeader";
import { authorLine } from "@/components/ipdae/TalkItem";
import { useServicePlan } from "@/hooks/useServicePlan";
import { useThread } from "@/hooks/useTalks";
import { ddayStatus } from "@/lib/dday";
import {
  type Memory,
  type MemoryAuthor,
  cohortLabel,
  cohortMonthOf,
  timeAgo,
} from "@/lib/memories";
import { REPLY_MAX_LENGTH } from "@/lib/talks";
import { cn } from "@/lib/utils";

/**
 * One 선후임 소통 글 and its replies. Anyone serving or discharged can
 * reply; before 입대 it is read only.
 */
export default function Talk() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { plan } = useServicePlan();
  const status = useMemo(() => (plan ? ddayStatus(plan) : null), [plan]);
  const {
    post,
    replies,
    isLoading,
    isError,
    error,
    refetch,
    reply,
    remove,
    like,
  } = useThread(id);
  const onError = (err: Error) => toast(err.message);

  const reserve = status?.status === "done";
  const canReply = !!post && !!status && status.status !== "notYet";
  const author: MemoryAuthor | null = plan
    ? {
        cohortMonth: cohortMonthOf(plan.enlist),
        branch: plan.branch,
        isReserve: reserve,
      }
    : null;

  // Asked in a dialog first (see ConfirmDelete)
  const [deleting, setDeleting] = useState<Memory | null>(null);
  const onDelete = (m: Memory) => setDeleting(m);
  const confirmDelete = () => {
    const m = deleting;
    setDeleting(null);
    if (!m) return;
    remove.mutate(m.id, {
      onSuccess: () => {
        toast("지웠어요");
        if (m.kind !== "talk") return;
        if (window.history.length > 1) navigate(-1);
        else navigate("/community/talk", { replace: true });
      },
      onError,
    });
  };

  return (
    <MobileShell>
      <SubHeader title="선후임 소통" />
      <main className="flex flex-1 flex-col gap-3 px-4 pb-8">
        {isLoading ? (
          <p className="py-8 text-center text-[13px] text-muted-foreground">
            불러오는 중…
          </p>
        ) : isError || !post ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border bg-card px-6 py-8 text-center text-[13.5px] text-muted-foreground">
            {error?.message ?? "글을 불러오지 못했어요."}
            <button
              type="button"
              onClick={() => refetch()}
              className="h-9 rounded-xl border bg-card px-4 text-[13px] font-bold text-primary"
            >
              다시 시도
            </button>
          </div>
        ) : (
          <>
            <article className="flex flex-col gap-2 rounded-2xl border-2 border-primary bg-card px-4 pb-2 pt-3.5">
              <div className="flex items-center gap-1.5 text-[11.5px] text-ink-icon">
                <span className="truncate">{authorLine(post)}</span>
                {post.mine && (
                  <span className="shrink-0 font-bold">· 내 글</span>
                )}
                <span className="flex-1" />
                <span className="shrink-0">{timeAgo(post.createdAt)}</span>
              </div>
              <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                {post.body}
              </p>
              <Actions
                post={post}
                onLike={() => like.mutate(post.id, { onError })}
                onDelete={() => onDelete(post)}
              />
            </article>

            <h2 className="px-1 text-[13px] font-bold">
              답글{" "}
              <span className="font-mono text-primary">{replies.length}</span>
            </h2>
            {replies.length === 0 ? (
              <p className="rounded-xl bg-muted px-4 py-5 text-center text-[13px] leading-relaxed text-muted-foreground">
                {post.mine
                  ? "아직 답글이 없어요. 답글이 달리면 알림으로 알려드려요."
                  : "아직 답글이 없어요. 첫 번째로 답해주세요."}
              </p>
            ) : (
              <ul className="flex flex-col gap-2" aria-label="답글">
                {replies.map((r) => (
                  <li
                    key={r.id}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-2xl border px-3.5 pb-2 pt-3",
                      r.byAsker ? "bg-accent/50" : "bg-card",
                    )}
                  >
                    <div className="flex items-center gap-1.5 text-[11px] text-ink-icon">
                      {r.byAsker && (
                        <span className="shrink-0 rounded-md bg-primary px-1.5 py-[2px] font-bold text-primary-foreground">
                          글쓴이
                        </span>
                      )}
                      <span className="truncate">
                        {cohortLabel(r.cohortMonth)} · {r.branch} ·{" "}
                        {r.isReserve ? "예비역" : "현역"}
                      </span>
                      {r.mine && (
                        <span className="shrink-0 font-bold">· 내 글</span>
                      )}
                      <span className="flex-1" />
                      <span className="shrink-0">{timeAgo(r.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {r.body}
                    </p>
                    <Actions
                      post={r}
                      onLike={() => like.mutate(r.id, { onError })}
                      onDelete={() => onDelete(r)}
                    />
                  </li>
                ))}
              </ul>
            )}

            {canReply && author ? (
              <PostComposer
                id="reply-composer"
                label={post.mine ? "덧붙이기" : "답하기"}
                help={
                  post.mine
                    ? "답해준 분들에게 고마움이나 근황을 남겨보세요."
                    : reserve
                      ? "그 시절의 나에게 해주고 싶던 말을 남겨주세요."
                      : "같은 시기를 지나는 사람으로서 한마디 남겨주세요."
                }
                hint={`${cohortLabel(author.cohortMonth)} · ${author.branch} · ${reserve ? "예비역" : "현역"}으로 표시돼요`}
                placeholder={
                  post.mine
                    ? "답 고마워요. 덕분에…"
                    : reserve
                      ? "저도 그랬어요. 지나고 보니…"
                      : "저도 요즘 그래요…"
                }
                maxLength={REPLY_MAX_LENGTH}
                submitLabel="답글 남기기"
                saving={reply.isPending}
                autoFocus={false}
                onSubmit={(body, done) =>
                  reply.mutate(
                    { body, author },
                    {
                      onSuccess: () => {
                        done();
                        toast("답글을 남겼어요");
                      },
                      onError,
                    },
                  )
                }
              />
            ) : (
              <p className="px-1 text-center text-xs text-ink-icon">
                입대하면 답글을 남길 수 있어요.
              </p>
            )}
          </>
        )}
      </main>
      <ConfirmDelete
        what={deleting?.kind === "talk" ? "글" : "답글"}
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </MobileShell>
  );
}

function Actions({
  post: m,
  onLike,
  onDelete,
}: {
  post: Memory;
  onLike: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center border-t border-muted pt-1">
      <button
        type="button"
        onClick={onLike}
        aria-pressed={m.likedByMe}
        aria-label={`공감 ${m.likes}`}
        className={cn(
          "-ml-1.5 flex h-8 items-center gap-1 rounded-lg px-1.5 text-xs",
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
          className="h-8 rounded-lg px-1.5 text-xs text-muted-foreground hover:text-destructive"
        >
          삭제
        </button>
      )}
    </div>
  );
}
