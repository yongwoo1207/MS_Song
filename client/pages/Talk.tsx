import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CornerDownRight, Heart } from "lucide-react";
import { toast } from "sonner";
import ConfirmDelete from "@/components/ipdae/ConfirmDelete";
import MobileShell from "@/components/ipdae/MobileShell";
import PostComposer from "@/components/ipdae/PostComposer";
import SubHeader from "@/components/ipdae/SubHeader";
import { useServicePlan } from "@/hooks/useServicePlan";
import { useThread } from "@/hooks/useTalks";
import { type Memory, authorLine, timeAgo, writerOf } from "@/lib/memories";
import { REPLY_MAX_LENGTH, groupReplies } from "@/lib/talks";
import { COMMUNITY_MAX_LENGTH, TITLE_MAX_LENGTH } from "@shared/posts";
import { cn } from "@/lib/utils";

/**
 * One 커뮤니티 글 or 선후임 소통 글 with its 댓글, and 대댓글 one level
 * under each 댓글. Anyone with a service plan can comment, 입대 예정자 too.
 */
export default function Talk() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { plan } = useServicePlan();
  const {
    post,
    replies,
    isLoading,
    isError,
    error,
    refetch,
    reply,
    edit,
    remove,
    like,
  } = useThread(id);
  const onError = (err: Error) => toast(err.message);
  const groups = useMemo(() => groupReplies(replies), [replies]);

  const author = useMemo(() => (plan ? writerOf(plan) : null), [plan]);
  const community = post?.kind === "post";
  // 대댓글 being written: under which 댓글, answering which one
  const [answering, setAnswering] = useState<{
    group: string;
    to: Memory;
  } | null>(null);

  // The post or 댓글 being edited in place
  const [editingId, setEditingId] = useState<string | null>(null);
  const saveEdit = (m: Memory, body: string, title?: string) =>
    edit.mutate(
      { postId: m.id, body, ...(title ? { title } : {}) },
      {
        onSuccess: () => setEditingId(null),
        onError,
      },
    );

  // Asked in a dialog first (see ConfirmDelete)
  const [deleting, setDeleting] = useState<Memory | null>(null);
  const onDelete = (m: Memory) => setDeleting(m);
  const confirmDelete = () => {
    const m = deleting;
    setDeleting(null);
    if (!m) return;
    remove.mutate(m.id, {
      onSuccess: () => {
        if (m.kind === "reply") return;
        if (window.history.length > 1) navigate(-1);
        else navigate("/community", { replace: true });
      },
      onError,
    });
  };

  const who = !author
    ? null
    : author.isReserve
      ? "reserve"
      : author.daysToEnlist != null
        ? "pre"
        : "serving";

  return (
    <MobileShell>
      <SubHeader title="커뮤니티" />
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
                <When m={post} />
              </div>
              {editingId === post.id ? (
                <div className="pb-2">
                  <PostComposer
                    id="edit-post"
                    label="글 고치기"
                    hint="고친 글에는 '수정됨'이 붙어요"
                    titleMaxLength={post.title ? TITLE_MAX_LENGTH : undefined}
                    initialTitle={post.title ?? ""}
                    initialBody={post.body}
                    placeholder="내용"
                    maxLength={COMMUNITY_MAX_LENGTH}
                    submitLabel="저장"
                    saving={edit.isPending}
                    onCancel={() => setEditingId(null)}
                    onSubmit={(body, _done, title) =>
                      saveEdit(post, body, title)
                    }
                  />
                </div>
              ) : (
                <>
                  {post.title && (
                    <h2 className="break-words text-[17px] font-bold leading-snug">
                      {post.title}
                    </h2>
                  )}
                  <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                    {post.body}
                  </p>
                  <Actions
                    post={post}
                    onLike={() => like.mutate(post.id, { onError })}
                    onEdit={() => setEditingId(post.id)}
                    onDelete={() => onDelete(post)}
                  />
                </>
              )}
            </article>

            <h2 className="px-1 text-[13px] font-bold">
              댓글{" "}
              <span className="font-mono text-primary">{replies.length}</span>
            </h2>
            {groups.length === 0 ? (
              <p className="rounded-xl bg-muted px-4 py-5 text-center text-[13px] leading-relaxed text-muted-foreground">
                {post.mine
                  ? "아직 댓글이 없어요. 댓글이 달리면 알림으로 알려드려요."
                  : "아직 댓글이 없어요. 첫 번째로 남겨주세요."}
              </p>
            ) : (
              <ul className="flex flex-col gap-2" aria-label="댓글">
                {groups.map((g) => (
                  <li key={g.id} className="flex flex-col gap-1.5">
                    {g.top ? (
                      <Comment
                        memory={g.top}
                        editing={editingId === g.top.id}
                        saving={edit.isPending}
                        onEdit={() => setEditingId(g.top!.id)}
                        onCancelEdit={() => setEditingId(null)}
                        onSave={(body) => saveEdit(g.top!, body)}
                        onLike={() => like.mutate(g.top!.id, { onError })}
                        onDelete={() => onDelete(g.top!)}
                        onAnswer={
                          author
                            ? () => setAnswering({ group: g.id, to: g.top! })
                            : undefined
                        }
                      />
                    ) : (
                      <p className="rounded-2xl bg-muted px-3.5 py-2.5 text-[12.5px] text-muted-foreground">
                        삭제된 댓글이에요
                      </p>
                    )}
                    {g.answers.length > 0 && (
                      <ul className="flex flex-col gap-1.5" aria-label="답글">
                        {g.answers.map((a) => (
                          <li key={a.id} className="flex gap-1.5 pl-2">
                            <CornerDownRight
                              className="mt-3 size-3.5 shrink-0 text-ink-icon"
                              strokeWidth={2}
                              aria-hidden="true"
                            />
                            <Comment
                              memory={a}
                              answer
                              editing={editingId === a.id}
                              saving={edit.isPending}
                              onEdit={() => setEditingId(a.id)}
                              onCancelEdit={() => setEditingId(null)}
                              onSave={(body) => saveEdit(a, body)}
                              onLike={() => like.mutate(a.id, { onError })}
                              onDelete={() => onDelete(a)}
                              onAnswer={
                                author
                                  ? () => setAnswering({ group: g.id, to: a })
                                  : undefined
                              }
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                    {author && answering?.group === g.id && (
                      <div className="ml-7 rounded-2xl border-2 border-primary bg-card px-3 pb-3 pt-3">
                        <PostComposer
                          id={`answer-${g.id}`}
                          label="답글 달기"
                          hint={`${authorLine(author)}으로 표시돼요`}
                          placeholder="답글을 남겨주세요"
                          maxLength={REPLY_MAX_LENGTH}
                          submitLabel="답글 남기기"
                          saving={reply.isPending}
                          onCancel={() => setAnswering(null)}
                          onSubmit={(body, done) =>
                            reply.mutate(
                              { body, author, replyTo: answering.to.id },
                              {
                                onSuccess: () => {
                                  done();
                                  setAnswering(null);
                                },
                                onError,
                              },
                            )
                          }
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {author ? (
              <PostComposer
                id="reply-composer"
                label="댓글 달기"
                help={
                  community
                    ? undefined
                    : post.mine
                      ? "답해준 분들에게 고마움이나 근황을 남겨보세요."
                      : who === "reserve"
                        ? "그 시절의 나에게 해주고 싶던 말을 남겨주세요."
                        : who === "pre"
                          ? "입대를 앞둔 사람으로서 궁금한 걸 묻거나 한마디 남겨주세요."
                          : "같은 시기를 지나는 사람으로서 한마디 남겨주세요."
                }
                hint={`${authorLine(author)}으로 표시돼요`}
                placeholder={
                  community
                    ? "댓글을 남겨주세요"
                    : post.mine
                      ? "답 고마워요. 덕분에…"
                      : who === "reserve"
                        ? "저도 그랬어요. 지나고 보니…"
                        : who === "pre"
                          ? "저도 곧 입대해요…"
                          : "저도 요즘 그래요…"
                }
                maxLength={REPLY_MAX_LENGTH}
                submitLabel="댓글 남기기"
                saving={reply.isPending && !answering}
                autoFocus={false}
                onSubmit={(body, done) =>
                  reply.mutate(
                    { body, author },
                    {
                      onSuccess: () => done(),
                      onError,
                    },
                  )
                }
              />
            ) : (
              <p className="px-1 text-center text-xs text-ink-icon">
                입대일을 넣으면 댓글을 남길 수 있어요.
              </p>
            )}
          </>
        )}
      </main>
      <ConfirmDelete
        what={
          deleting?.kind !== "reply" ? "글" : deleting.replyTo ? "답글" : "댓글"
        }
        open={!!deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </MobileShell>
  );
}

/** "3시간 전", plus "· 수정됨" once edited. */
function When({ m }: { m: Memory }) {
  return (
    <span className="shrink-0">
      {timeAgo(m.createdAt)}
      {m.editedAt && " · 수정됨"}
    </span>
  );
}

/** A 댓글, or with `answer` a 대댓글 under one; editable in place. */
function Comment({
  memory: r,
  answer,
  editing,
  saving,
  onEdit,
  onCancelEdit,
  onSave,
  onLike,
  onDelete,
  onAnswer,
}: {
  memory: Memory;
  answer?: boolean;
  editing: boolean;
  saving: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (body: string) => void;
  onLike: () => void;
  onDelete: () => void;
  onAnswer?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-1.5 rounded-2xl border px-3.5 pb-2 pt-3",
        r.byAsker ? "bg-accent/50" : answer ? "bg-muted/40" : "bg-card",
      )}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-ink-icon">
        {r.byAsker && (
          <span className="shrink-0 rounded-md bg-primary px-1.5 py-[2px] font-bold text-primary-foreground">
            글쓴이
          </span>
        )}
        <span className="truncate">{authorLine(r)}</span>
        {r.mine && <span className="shrink-0 font-bold">· 내 글</span>}
        <span className="flex-1" />
        <When m={r} />
      </div>
      {editing ? (
        <div className="pb-1.5">
          <PostComposer
            id={`edit-${r.id}`}
            label={answer ? "답글 고치기" : "댓글 고치기"}
            hint="고친 댓글에는 '수정됨'이 붙어요"
            initialBody={r.body}
            placeholder="내용"
            maxLength={REPLY_MAX_LENGTH}
            submitLabel="저장"
            saving={saving}
            onCancel={onCancelEdit}
            onSubmit={(body) => onSave(body)}
          />
        </div>
      ) : (
        <>
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {r.body}
          </p>
          <Actions
            post={r}
            onLike={onLike}
            onEdit={onEdit}
            onDelete={onDelete}
            onAnswer={onAnswer}
          />
        </>
      )}
    </div>
  );
}

function Actions({
  post: m,
  onLike,
  onEdit,
  onDelete,
  onAnswer,
}: {
  post: Memory;
  onLike: () => void;
  onEdit: () => void;
  onDelete: () => void;
  /** Open the 답글 box (댓글 only) */
  onAnswer?: () => void;
}) {
  return (
    <div className="flex items-center gap-1 border-t border-muted pt-1">
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
      {onAnswer && (
        <button
          type="button"
          onClick={onAnswer}
          className="h-8 rounded-lg px-1.5 text-xs font-bold text-muted-foreground"
        >
          답글
        </button>
      )}
      <span className="flex-1" />
      {m.mine && (
        <button
          type="button"
          onClick={onEdit}
          className="h-8 rounded-lg px-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          수정
        </button>
      )}
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
