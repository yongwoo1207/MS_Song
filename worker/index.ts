/**
 * Cloudflare Worker: serves the built site (dist/spa) and the posts API on
 * D1. Only /api/* reaches this code (see run_worker_first in wrangler.jsonc).
 *
 *   GET    /api/posts?song=<key>[&limit=20][&before=<cursor>]
 *                                    memories under a song, newest first,
 *                                    a page at a time ({ posts, next })
 *   GET    /api/posts?feed=story|music[&rank=][&reserve=1][&before=<cursor>]
 *                                    커뮤니티 이야기 (글) or 음악 (memories
 *                                    under songs), newest first
 *   GET    /api/posts?kind=talk[&reserve=0|1|pre][&before=<cursor>]
 *                                    선후임 소통 글, newest first
 *   GET    /api/posts/:id            a 커뮤니티 글 or 소통 글 with its 댓글
 *                                    and 대댓글
 *   POST   /api/posts                write a song memory (NewSongRecord),
 *                                    a 커뮤니티 글 (NewCommunityPost),
 *                                    a 소통 글 (NewTalk) or a reply (NewReply)
 *   DELETE /api/posts/:id            delete your own post
 *   POST   /api/posts/:id/like       like / unlike
 *   POST   /api/posts/:id/report     report ({ reason })
 *   GET    /api/events?from=YYYY-MM&to=YYYY-MM
 *                                    major issues (사건) of those months
 *   GET    /api/song-counts          ApiSongStats: memories and hearts per song
 *   POST   /api/songs/like           heart / unheart a song ({ key })
 *   GET    /api/me/posts             everything I wrote (hidden ones too)
 *   GET    /api/notifications[?count=1]
 *                                    likes and replies on my posts, per post
 *   POST   /api/notifications/read   mark all read
 *
 * Callers are anonymous: the browser sends a random device token and only
 * its SHA-256 hash is stored, as authors.id.
 */
import { z } from "zod";
import {
  type ApiEvent,
  type ApiNotification,
  type ApiPost,
  type ApiSongStats,
  DEVICE_HEADER,
  POST_BRANCHES,
  POST_RANKS,
  RECORD_MAX_LENGTH,
  REPLY_MAX_LENGTH,
  COMMUNITY_MAX_LENGTH,
  REPORT_REASONS,
  TALK_MAX_LENGTH,
  TITLE_MAX_LENGTH,
} from "../shared/posts";

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

const HIDE_AFTER_REPORTS = 3;
const LIMITS = [
  { seconds: 60, max: 3, message: "조금 뒤에 다시 남겨주세요" },
  { seconds: 86_400, max: 30, message: "오늘은 더 남길 수 없어요" },
];
const MAX_BODY_BYTES = 8_192;

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const PAGE = 20; // posts per page in paged lists

const RecordBase = z.object({
  kind: z.literal("record"),
  body: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "내용을 입력해주세요").max(RECORD_MAX_LENGTH)),
  rank: z.enum(POST_RANKS),
  cohortMonth: z.string().regex(MONTH),
  branch: z.enum(POST_BRANCHES),
  isReserve: z.boolean(),
  daysToEnlist: z.number().int().min(0).max(1000).nullable().default(null),
});
const NewSongRecord = RecordBase.extend({
  song: z.object({
    key: z.string().min(3).max(300),
    title: z.string().min(1).max(200),
    artist: z.string().min(1).max(200),
  }),
  aboutMonth: z.string().regex(MONTH),
});
const text = (max: number) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "내용을 입력해주세요").max(max));
const Author = {
  cohortMonth: z.string().regex(MONTH),
  branch: z.enum(POST_BRANCHES),
  isReserve: z.boolean(),
  // 입대 예정자 only; older clients leave it out
  daysToEnlist: z.number().int().min(0).max(1000).nullable().default(null),
};
/** Title of a 커뮤니티 글 or 소통 글. */
const Title = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1, "제목을 입력해주세요").max(TITLE_MAX_LENGTH));
/** A 커뮤니티 글: a free post with a title. `rank`: the writer's now. */
const NewCommunityPost = z.object({
  kind: z.literal("post"),
  title: Title,
  body: text(COMMUNITY_MAX_LENGTH),
  rank: z.enum(POST_RANKS).nullable(),
  ...Author,
});
const NewTalk = z.object({
  kind: z.literal("talk"),
  title: Title,
  body: text(TALK_MAX_LENGTH),
  rank: z.enum(POST_RANKS).nullable(),
  ...Author,
});
const NewReply = z.object({
  kind: z.literal("reply"),
  parentId: z.string().min(1).max(64),
  replyTo: z.string().min(1).max(64).nullable().default(null),
  body: text(REPLY_MAX_LENGTH),
  ...Author,
});
const SongLike = z.object({ key: z.string().min(3).max(300) });
const Report = z.object({ reason: z.enum(REPORT_REASONS) });

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** authors.id for this request, or null when no valid token was sent. */
async function authorOf(req: Request): Promise<string | null> {
  const token = req.headers.get(DEVICE_HEADER) ?? "";
  return /^[A-Za-z0-9-]{16,64}$/.test(token) ? sha256Hex(token) : null;
}

/** authors.id of a caller allowed to write; creates the author row. */
async function writer(req: Request, db: D1Database): Promise<string> {
  const me = await authorOf(req);
  if (!me) throw new HttpError(401, "기기 정보가 없어요. 새로고침해 주세요");
  await db
    .prepare("INSERT OR IGNORE INTO authors (id) VALUES (?)")
    .bind(me)
    .run();
  const row = await db
    .prepare("SELECT banned FROM authors WHERE id = ?")
    .bind(me)
    .first<{ banned: number }>();
  if (row?.banned) throw new HttpError(403, "글을 남길 수 없는 상태예요");
  return me;
}

async function readJson(req: Request) {
  const size = Number(req.headers.get("content-length") ?? 0);
  if (size > MAX_BODY_BYTES) throw new HttpError(413, "내용이 너무 길어요");
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "잘못된 요청이에요");
  }
}

interface PostRow {
  id: string;
  kind: ApiPost["kind"];
  title: string | null;
  body: string;
  song_key: string | null;
  song_title: string | null;
  song_artist: string | null;
  rank: ApiPost["rank"];
  about_month: string | null;
  parent_id: string | null;
  cohort_month: string;
  branch: ApiPost["branch"];
  is_reserve: number;
  days_to_enlist: number | null;
  reply_to: string | null;
  like_count: number;
  reply_count: number;
  created_at: string;
  author_id: string;
  status: "visible" | "hidden" | "deleted";
  liked_by_me: number;
}

/** `asker`: author of the talk when listing its replies. */
const toApi = (r: PostRow, me: string | null, asker?: string): ApiPost => ({
  id: r.id,
  kind: r.kind,
  title: r.title,
  body: r.body,
  song: r.song_key
    ? { key: r.song_key, title: r.song_title!, artist: r.song_artist! }
    : null,
  rank: r.rank,
  aboutMonth: r.about_month,
  cohortMonth: r.cohort_month,
  branch: r.branch,
  isReserve: !!r.is_reserve,
  daysToEnlist: r.days_to_enlist,
  likes: r.like_count,
  replies: r.reply_count,
  createdAt: r.created_at,
  likedByMe: !!r.liked_by_me,
  mine: !!me && r.author_id === me,
  parentId: r.parent_id,
  replyTo: r.reply_to,
  ...(asker ? { byAsker: r.author_id === asker } : {}),
  hidden: r.status === "hidden",
});

const parse = <S extends z.ZodTypeAny>(
  schema: S,
  raw: unknown,
): z.output<S> => {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(
      400,
      parsed.error.issues[0]?.message ?? "잘못된 요청이에요",
    );
  }
  return parsed.data;
};

const SELECT_POST = `
  SELECT p.*, (l.author_id IS NOT NULL) AS liked_by_me
  FROM posts p
  LEFT JOIN likes l ON l.post_id = p.id AND l.author_id = ?1`;

/**
 * One page of posts matching `where`, newest first. `where` may use ?1 (me)
 * and ?5, ?6 … for `params`. The cursor "created_at|id" is the last post of
 * the previous page.
 */
async function pagedPosts(
  req: Request,
  env: Env,
  url: URL,
  where: string,
  params: unknown[] = [],
) {
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("limit")) || PAGE),
  );
  const before = url.searchParams.get("before");
  const cut = before ? before.lastIndexOf("|") : -1;
  const beforeAt = cut > 0 ? before!.slice(0, cut) : null;
  const beforeId = cut > 0 ? before!.slice(cut + 1) : null;
  const me = await authorOf(req);
  const { results } = await env.DB.prepare(
    `${SELECT_POST}
     WHERE ${where}
       AND (?3 IS NULL OR p.created_at < ?3
            OR (p.created_at = ?3 AND p.id < ?4))
     ORDER BY p.created_at DESC, p.id DESC
     LIMIT ?2`,
  )
    .bind(me ?? "", limit + 1, beforeAt, beforeId, ...params)
    .all<PostRow>();
  const page = results.slice(0, limit);
  const last = page[page.length - 1];
  return json({
    posts: page.map((r) => toApi(r, me)),
    next:
      results.length > limit && last ? `${last.created_at}|${last.id}` : null,
  });
}

/** Memories under one song. */
const listSongRecords = (req: Request, env: Env, url: URL, song: string) =>
  pagedPosts(
    req,
    env,
    url,
    "p.kind = 'record' AND p.song_key = ?5 AND p.status = 'visible'",
    [song],
  );

/**
 * A 커뮤니티 board: `feed=story` 커뮤니티 글, `feed=music` memories under
 * songs (both for any other value, as older clients ask). `rank` only that
 * rank's (the chart's, for a song), `reserve=1` only by 예비역.
 */
function listCommunityFeed(req: Request, env: Env, url: URL) {
  const feed = url.searchParams.get("feed");
  const kinds =
    feed === "story"
      ? "('post')"
      : feed === "music"
        ? "('record')"
        : "('record', 'post')";
  const rank = z.enum(POST_RANKS).safeParse(url.searchParams.get("rank"));
  const reserve = url.searchParams.get("reserve") === "1" ? 1 : null;
  return pagedPosts(
    req,
    env,
    url,
    `p.kind IN ${kinds} AND p.status = 'visible'
     AND (?5 IS NULL OR p.rank = ?5) AND (?6 IS NULL OR p.is_reserve = ?6)`,
    [rank.success ? rank.data : null, reserve],
  );
}

/**
 * 선후임 소통 글; `reserve=1` only by 예비역, `reserve=0` only by 현역,
 * `reserve=pre` only by 입대 예정자.
 */
function listTalks(req: Request, env: Env, url: URL) {
  const r = url.searchParams.get("reserve");
  const who =
    r === "1"
      ? "AND p.is_reserve = 1"
      : r === "0"
        ? "AND p.is_reserve = 0 AND p.days_to_enlist IS NULL"
        : r === "pre"
          ? "AND p.days_to_enlist IS NOT NULL"
          : "";
  return pagedPosts(
    req,
    env,
    url,
    `p.kind = 'talk' AND p.status = 'visible' ${who}`,
  );
}

/** A 커뮤니티 글 or 소통 글 and its 댓글 and 대댓글, oldest first. */
async function getThread(req: Request, env: Env, id: string) {
  const me = await authorOf(req);
  const talk = await env.DB.prepare(
    `${SELECT_POST} WHERE p.id = ?2 AND p.kind IN ('talk', 'post')
       AND p.status = 'visible'`,
  )
    .bind(me ?? "", id)
    .first<PostRow>();
  if (!talk) throw new HttpError(404, "글을 찾을 수 없어요");
  const { results } = await env.DB.prepare(
    `${SELECT_POST}
     WHERE p.parent_id = ?2 AND p.kind = 'reply' AND p.status = 'visible'
     ORDER BY p.created_at, p.id
     LIMIT 300`,
  )
    .bind(me ?? "", id)
    .all<PostRow>();
  return json({
    post: toApi(talk, me),
    replies: results.map((r) => toApi(r, me, talk.author_id)),
  });
}

interface EventRow {
  id: string;
  month: string;
  date: string | null;
  title: string;
  summary: string;
  scope: string;
  source_url: string | null;
}

const toApiEvent = (r: EventRow): ApiEvent => ({
  id: r.id,
  month: r.month,
  date: r.date,
  title: r.title,
  summary: r.summary,
  scope: r.scope,
  sourceUrl: r.source_url,
});

async function listEvents(env: Env, url: URL) {
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!MONTH.test(from) || !MONTH.test(to) || from > to) {
    throw new HttpError(400, "from, to 값이 필요해요 (YYYY-MM)");
  }
  const { results } = await env.DB.prepare(
    `SELECT * FROM events e
     WHERE e.month BETWEEN ? AND ?
     ORDER BY e.month, COALESCE(e.date, e.month)`,
  )
    .bind(from, to)
    .all<EventRow>();
  return json({ events: results.map(toApiEvent) });
}

/** Memories and hearts per song, for the chart lists. */
async function songCounts(req: Request, env: Env) {
  const { results } = await env.DB.prepare(
    `SELECT song_key AS k, COUNT(*) AS n FROM posts
     WHERE kind = 'record' AND status = 'visible'
     GROUP BY song_key`,
  ).all<{ k: string; n: number }>();
  const stats: ApiSongStats = {
    counts: Object.fromEntries(results.map((r) => [r.k, r.n])),
    likes: {},
    liked: [],
  };
  // Hearts are best effort, so the counts still load without migration 0005
  try {
    const me = await authorOf(req);
    const [all, mine] = await env.DB.batch<{ k: string; n: number }>([
      env.DB.prepare(
        "SELECT song_key AS k, COUNT(*) AS n FROM song_likes GROUP BY song_key",
      ),
      env.DB.prepare(
        "SELECT song_key AS k, 1 AS n FROM song_likes WHERE author_id = ?",
      ).bind(me ?? ""),
    ]);
    stats.likes = Object.fromEntries(all.results.map((r) => [r.k, r.n]));
    stats.liked = mine.results.map((r) => r.k);
  } catch (err) {
    console.error("song likes unavailable", err);
  }
  return json(stats);
}

async function toggleSongLike(req: Request, env: Env) {
  const { key } = parse(SongLike, await readJson(req));
  const me = await writer(req, env.DB);
  const added = await env.DB.prepare(
    "INSERT OR IGNORE INTO song_likes (song_key, author_id) VALUES (?, ?)",
  )
    .bind(key, me)
    .run();
  const liked = added.meta.changes > 0;
  if (!liked) {
    await env.DB.prepare(
      "DELETE FROM song_likes WHERE song_key = ? AND author_id = ?",
    )
      .bind(key, me)
      .run();
  }
  const row = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM song_likes WHERE song_key = ?",
  )
    .bind(key)
    .first<{ n: number }>();
  return json({ liked, likes: row?.n ?? 0 });
}

/** Everything the caller wrote, newest first, hidden (reported) ones too. */
async function listMyPosts(req: Request, env: Env) {
  const me = await authorOf(req);
  if (!me) return json({ posts: [] });
  const { results } = await env.DB.prepare(
    `${SELECT_POST}
     WHERE p.author_id = ?1 AND p.status <> 'deleted'
     ORDER BY p.created_at DESC
     LIMIT 200`,
  )
    .bind(me)
    .all<PostRow>();
  return json({ posts: results.map((r) => toApi(r, me)) });
}

interface NotificationRow {
  type: ApiNotification["type"];
  post_id: string;
  count: number;
  unread: number;
  last_at: string;
  kind: ApiPost["kind"];
  title: string | null;
  body: string;
  song_title: string | null;
  rank: ApiPost["rank"];
  about_month: string | null;
  parent_id: string | null;
}

/** Likes and replies on my posts, one entry per post and type, newest activity first. */
async function listNotifications(req: Request, env: Env, url: URL) {
  const onlyCount = url.searchParams.get("count") === "1";
  const me = await authorOf(req);
  if (!me) {
    return json(onlyCount ? { unread: 0 } : { unread: 0, notifications: [] });
  }
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM notifications n
     JOIN posts p ON p.id = n.post_id
     WHERE n.recipient_id = ? AND n.read_at IS NULL AND p.status <> 'deleted'`,
  )
    .bind(me)
    .first<{ n: number }>();
  const unread = row?.n ?? 0;
  if (onlyCount) return json({ unread });
  const { results } = await env.DB.prepare(
    `SELECT n.type, n.post_id, COUNT(*) AS count,
            SUM(n.read_at IS NULL) AS unread, MAX(n.created_at) AS last_at,
            p.kind, p.title, p.body, p.song_title, p.rank, p.about_month,
            p.parent_id
     FROM notifications n
     JOIN posts p ON p.id = n.post_id
     WHERE n.recipient_id = ? AND p.status <> 'deleted'
     GROUP BY n.type, n.post_id
     ORDER BY last_at DESC
     LIMIT 50`,
  )
    .bind(me)
    .all<NotificationRow>();
  const notifications: ApiNotification[] = results.map((r) => ({
    type: r.type,
    postId: r.post_id,
    count: r.count,
    unread: r.unread,
    lastAt: r.last_at,
    post: {
      kind: r.kind,
      title: r.title,
      body: r.body,
      songTitle: r.song_title,
      rank: r.rank,
      aboutMonth: r.about_month,
      parentId: r.parent_id,
    },
  }));
  return json({ unread, notifications });
}

async function markNotificationsRead(req: Request, env: Env) {
  const me = await authorOf(req);
  if (!me) throw new HttpError(401, "기기 정보가 없어요");
  await env.DB.prepare(
    `UPDATE notifications SET read_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE recipient_id = ? AND read_at IS NULL`,
  )
    .bind(me)
    .run();
  return new Response(null, { status: 204 });
}

/**
 * Tell the author about a like (never about their own). An unread one is
 * taken back on unlike. Best effort: the like still counts if this fails.
 */
async function notifyLike(
  db: D1Database,
  postId: string,
  actor: string,
  liked: boolean,
) {
  try {
    if (liked) {
      await db
        .prepare(
          `INSERT OR IGNORE INTO notifications (recipient_id, type, post_id, actor_id)
           SELECT author_id, 'like', id, ?2 FROM posts
           WHERE id = ?1 AND author_id <> ?2`,
        )
        .bind(postId, actor)
        .run();
    } else {
      await db
        .prepare(
          `DELETE FROM notifications
           WHERE type = 'like' AND post_id = ? AND actor_id = ? AND read_at IS NULL`,
        )
        .bind(postId, actor)
        .run();
    }
  } catch (err) {
    console.error("notifyLike failed", err);
  }
}

/**
 * Tell whoever wrote a post about a 댓글 under it, or a 댓글 about a 대댓글
 * (never about their own). More from the same person bring the notification
 * back as unread.
 */
async function notifyReply(db: D1Database, postId: string, actor: string) {
  try {
    await db
      .prepare(
        `INSERT INTO notifications (recipient_id, type, post_id, actor_id)
         SELECT author_id, 'reply', id, ?2 FROM posts
         WHERE id = ?1 AND author_id <> ?2
         ON CONFLICT (type, post_id, actor_id) DO UPDATE
           SET read_at = NULL,
               created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
      )
      .bind(postId, actor)
      .run();
  } catch (err) {
    console.error("notifyReply failed", err);
  }
}

/** Rate limits shared by every kind of post. */
async function checkLimits(db: D1Database, me: string) {
  for (const limit of LIMITS) {
    const row = await db
      .prepare(
        `SELECT COUNT(*) AS n FROM posts
         WHERE author_id = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?)`,
      )
      .bind(me, `-${limit.seconds} seconds`)
      .first<{ n: number }>();
    if ((row?.n ?? 0) >= limit.max) throw new HttpError(429, limit.message);
  }
}

async function createPost(req: Request, env: Env) {
  const raw = await readJson(req);
  const kind =
    raw && typeof raw === "object" && "kind" in raw ? raw.kind : null;
  if (kind === "post")
    return createPlain(env, req, parse(NewCommunityPost, raw));
  if (kind === "talk") return createPlain(env, req, parse(NewTalk, raw));
  if (kind === "reply") return createReply(env, req, raw);
  if (kind === "record") return createRecord(req, env, raw);
  throw new HttpError(400, "잘못된 요청이에요");
}

/** A 커뮤니티 글 or a 소통 글: (title,) body, rank and who wrote it. */
async function createPlain(
  env: Env,
  req: Request,
  input: z.infer<typeof NewCommunityPost> | z.infer<typeof NewTalk>,
) {
  const me = await writer(req, env.DB);
  await checkLimits(env.DB, me);
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO posts (id, kind, title, body, rank, author_id, cohort_month,
                        branch, is_reserve, days_to_enlist)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      input.kind,
      input.title,
      input.body,
      input.rank,
      me,
      input.cohortMonth,
      input.branch,
      input.isReserve ? 1 : 0,
      input.isReserve ? null : input.daysToEnlist,
    )
    .run();
  const row = await env.DB.prepare(`${SELECT_POST} WHERE p.id = ?2`)
    .bind(me, id)
    .first<PostRow>();
  return json({ post: toApi(row!, me) }, 201);
}

async function createReply(env: Env, req: Request, raw: unknown) {
  const input = parse(NewReply, raw);
  const me = await writer(req, env.DB);
  const talk = await env.DB.prepare(
    `SELECT author_id FROM posts
     WHERE id = ? AND kind IN ('talk', 'post') AND status = 'visible'`,
  )
    .bind(input.parentId)
    .first<{ author_id: string }>();
  if (!talk) throw new HttpError(404, "글을 찾을 수 없어요");
  // 대댓글: answers a 댓글 of this thread. Kept one level deep, so an
  // answer to a 대댓글 files under the 댓글 that one answers.
  let target: { id: string; author_id: string; top: string } | null = null;
  if (input.replyTo) {
    target = await env.DB.prepare(
      `SELECT id, author_id, COALESCE(reply_to, id) AS top FROM posts
       WHERE id = ? AND kind = 'reply' AND parent_id = ? AND status = 'visible'`,
    )
      .bind(input.replyTo, input.parentId)
      .first<{ id: string; author_id: string; top: string }>();
    if (!target) throw new HttpError(404, "답글을 달 댓글이 없어요");
  }
  await checkLimits(env.DB, me);
  const id = crypto.randomUUID();
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO posts (id, kind, body, parent_id, reply_to, author_id,
                          cohort_month, branch, is_reserve, days_to_enlist)
       VALUES (?, 'reply', ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      input.body,
      input.parentId,
      target?.top ?? null,
      me,
      input.cohortMonth,
      input.branch,
      input.isReserve ? 1 : 0,
      input.isReserve ? null : input.daysToEnlist,
    ),
    env.DB.prepare(
      "UPDATE posts SET reply_count = reply_count + 1 WHERE id = ?",
    ).bind(input.parentId),
  ]);
  if (target) await notifyReply(env.DB, target.id, me);
  // The thread's author hears of it too, unless it answers their own 댓글
  if (!target || target.author_id !== talk.author_id)
    await notifyReply(env.DB, input.parentId, me);
  const row = await env.DB.prepare(`${SELECT_POST} WHERE p.id = ?2`)
    .bind(me, id)
    .first<PostRow>();
  return json({ post: toApi(row!, me, talk.author_id) }, 201);
}

/** A memory under a song. */
async function createRecord(req: Request, env: Env, raw: unknown) {
  const input = parse(NewSongRecord, raw);
  const me = await writer(req, env.DB);
  await checkLimits(env.DB, me);

  const { song } = input;

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO posts (id, kind, body, song_key, song_title, song_artist,
                        rank, about_month, author_id, cohort_month,
                        branch, is_reserve, days_to_enlist)
     VALUES (?, 'record', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      input.body,
      song.key,
      song.title,
      song.artist,
      input.rank,
      input.aboutMonth,
      me,
      input.cohortMonth,
      input.branch,
      input.isReserve ? 1 : 0,
      input.isReserve ? null : input.daysToEnlist,
    )
    .run();

  const row = await env.DB.prepare(`${SELECT_POST} WHERE p.id = ?2`)
    .bind(me, id)
    .first<PostRow>();
  return json({ post: toApi(row!, me) }, 201);
}

async function visiblePost(db: D1Database, id: string) {
  const row = await db
    .prepare("SELECT id FROM posts WHERE id = ? AND status = 'visible'")
    .bind(id)
    .first();
  if (!row) throw new HttpError(404, "글을 찾을 수 없어요");
}

async function deletePost(req: Request, env: Env, id: string) {
  const me = await authorOf(req);
  if (!me) throw new HttpError(401, "기기 정보가 없어요");
  const gone = await env.DB.prepare(
    `UPDATE posts SET status = 'deleted'
     WHERE id = ? AND author_id = ? AND status <> 'deleted'
     RETURNING kind, parent_id`,
  )
    .bind(id, me)
    .first<{ kind: ApiPost["kind"]; parent_id: string | null }>();
  if (!gone) throw new HttpError(404, "지울 수 있는 글이 아니에요");
  if (gone.kind === "reply" && gone.parent_id) {
    await env.DB.prepare(
      "UPDATE posts SET reply_count = MAX(0, reply_count - 1) WHERE id = ?",
    )
      .bind(gone.parent_id)
      .run();
  }
  return new Response(null, { status: 204 });
}

async function toggleLike(req: Request, env: Env, id: string) {
  const me = await writer(req, env.DB);
  await visiblePost(env.DB, id);
  const added = await env.DB.prepare(
    "INSERT OR IGNORE INTO likes (post_id, author_id) VALUES (?, ?)",
  )
    .bind(id, me)
    .run();
  const liked = added.meta.changes > 0;
  if (!liked) {
    await env.DB.prepare(
      "DELETE FROM likes WHERE post_id = ? AND author_id = ?",
    )
      .bind(id, me)
      .run();
  }
  const row = await env.DB.prepare(
    `UPDATE posts SET like_count = MAX(0, like_count + ?) WHERE id = ?
     RETURNING like_count`,
  )
    .bind(liked ? 1 : -1, id)
    .first<{ like_count: number }>();
  await notifyLike(env.DB, id, me, liked);
  return json({ liked, likes: row?.like_count ?? 0 });
}

async function reportPost(req: Request, env: Env, id: string) {
  const parsed = Report.safeParse(await readJson(req));
  if (!parsed.success) throw new HttpError(400, "신고 사유를 골라주세요");
  const me = await writer(req, env.DB);
  await visiblePost(env.DB, id);
  const added = await env.DB.prepare(
    "INSERT OR IGNORE INTO reports (post_id, author_id, reason) VALUES (?, ?, ?)",
  )
    .bind(id, me, parsed.data.reason)
    .run();
  if (added.meta.changes) {
    await env.DB.prepare(
      `UPDATE posts
       SET report_count = report_count + 1,
           status = CASE WHEN report_count + 1 >= ? AND status = 'visible'
                         THEN 'hidden' ELSE status END
       WHERE id = ?`,
    )
      .bind(HIDE_AFTER_REPORTS, id)
      .run();
  }
  return new Response(null, { status: 204 });
}

async function handleApi(req: Request, env: Env, url: URL): Promise<Response> {
  const parts = url.pathname.split("/").filter(Boolean); // ["api","posts",id?,action?]
  const [, resource, id, action] = parts;

  if (resource === "events" && parts.length === 2 && req.method === "GET") {
    return listEvents(env, url);
  }
  if (
    resource === "song-counts" &&
    parts.length === 2 &&
    req.method === "GET"
  ) {
    return songCounts(req, env);
  }
  if (resource === "songs" && id === "like" && parts.length === 3) {
    if (req.method === "POST") return toggleSongLike(req, env);
  }
  if (resource === "me" && id === "posts" && parts.length === 3) {
    if (req.method === "GET") return listMyPosts(req, env);
  }
  if (resource === "notifications") {
    if (parts.length === 2 && req.method === "GET") {
      return listNotifications(req, env, url);
    }
    if (id === "read" && parts.length === 3 && req.method === "POST") {
      return markNotificationsRead(req, env);
    }
    throw new HttpError(404, "없는 주소예요");
  }
  if (resource !== "posts" || parts.length > 4)
    throw new HttpError(404, "없는 주소예요");

  if (!id) {
    if (req.method === "GET") {
      const song = url.searchParams.get("song");
      if (song) return listSongRecords(req, env, url, song);
      if (url.searchParams.get("feed")) {
        return listCommunityFeed(req, env, url);
      }
      const kind = url.searchParams.get("kind");
      if (kind === "talk") return listTalks(req, env, url);
      throw new HttpError(400, "잘못된 요청이에요");
    }
    if (req.method === "POST") return createPost(req, env);
  } else if (!action && req.method === "GET") {
    return getThread(req, env, id);
  } else if (!action && req.method === "DELETE") {
    return deletePost(req, env, id);
  } else if (action === "like" && req.method === "POST") {
    return toggleLike(req, env, id);
  } else if (action === "report" && req.method === "POST") {
    return reportPost(req, env, id);
  }
  throw new HttpError(405, "지원하지 않는 요청이에요");
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    try {
      return await handleApi(req, env, url);
    } catch (err) {
      if (err instanceof HttpError)
        return json({ error: err.message }, err.status);
      console.error(err);
      return json({ error: "잠시 후 다시 시도해주세요" }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
