/**
 * Cloudflare Worker: serves the built site (dist/spa) and the posts API on
 * D1. Only /api/* reaches this code (see run_worker_first in wrangler.jsonc).
 *
 *   GET    /api/posts?song=<key>     memories under a song, newest first
 *   GET    /api/posts?from=YYYY-MM&to=YYYY-MM[&cohort=YYYY-MM]
 *                                    records written to those timeline
 *                                    months, by month then most liked
 *   GET    /api/posts?kind=letter&rank=상병&hobong=2
 *   GET    /api/posts?kind=letter&mine=1   (my own 한마디)
 *                                    한마디 left for that 계급·호봉, most liked
 *   POST   /api/posts                write a record (NewSongRecord or
 *                                    NewMonthRecord) or a letter (NewLetter)
 *   DELETE /api/posts/:id            delete your own post
 *   POST   /api/posts/:id/like       like / unlike
 *   POST   /api/posts/:id/report     report ({ reason })
 *   GET    /api/events?from=YYYY-MM&to=YYYY-MM
 *                                    major issues (사건) of those months
 *
 * Callers are anonymous: the browser sends a random device token and only
 * its SHA-256 hash is stored, as authors.id.
 */
import { z } from "zod";
import {
  type ApiEvent,
  type ApiPost,
  DEVICE_HEADER,
  LETTER_MAX_LENGTH,
  LETTERS_PER_SLOT,
  POST_BRANCHES,
  POST_RANKS,
  RECORD_MAX_LENGTH,
  REPORT_REASONS,
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
const TIMELINE_LIMIT = 1000;

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
});
const NewSongRecord = RecordBase.extend({
  song: z.object({
    key: z.string().min(3).max(300),
    title: z.string().min(1).max(200),
    artist: z.string().min(1).max(200),
  }),
  aboutMonth: z.string().regex(MONTH),
});
const NewMonthRecord = RecordBase.extend({
  aboutMonth: z.string().regex(MONTH),
  hobong: z.number().int().min(1).max(12).optional(),
});
const NewLetter = z.object({
  kind: z.literal("letter"),
  body: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "내용을 입력해주세요").max(LETTER_MAX_LENGTH)),
  rank: z.enum(POST_RANKS),
  hobong: z.number().int().min(1).max(12),
  cohortMonth: z.string().regex(MONTH),
  branch: z.enum(POST_BRANCHES),
  isReserve: z.boolean(),
});
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
  body: string;
  song_key: string | null;
  song_title: string | null;
  song_artist: string | null;
  rank: ApiPost["rank"];
  hobong: number | null;
  about_month: string | null;
  cohort_month: string;
  branch: ApiPost["branch"];
  is_reserve: number;
  like_count: number;
  reply_count: number;
  created_at: string;
  author_id: string;
  liked_by_me: number;
}

const toApi = (r: PostRow, me: string | null): ApiPost => ({
  id: r.id,
  kind: r.kind,
  body: r.body,
  song: r.song_key
    ? { key: r.song_key, title: r.song_title!, artist: r.song_artist! }
    : null,
  rank: r.rank,
  hobong: r.hobong,
  aboutMonth: r.about_month,
  cohortMonth: r.cohort_month,
  branch: r.branch,
  isReserve: !!r.is_reserve,
  likes: r.like_count,
  replies: r.reply_count,
  createdAt: r.created_at,
  likedByMe: !!r.liked_by_me,
  mine: !!me && r.author_id === me,
});

const SELECT_POST = `
  SELECT p.*, (l.author_id IS NOT NULL) AS liked_by_me
  FROM posts p
  LEFT JOIN likes l ON l.post_id = p.id AND l.author_id = ?1`;

/** Memories under one song, newest first. */
async function listSongRecords(req: Request, env: Env, url: URL, song: string) {
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("limit")) || 50),
  );
  const me = await authorOf(req);
  const { results } = await env.DB.prepare(
    `${SELECT_POST}
     WHERE p.kind = 'record' AND p.song_key = ?2 AND p.status = 'visible'
     ORDER BY p.created_at DESC
     LIMIT ?3`,
  )
    .bind(me ?? "", song, limit)
    .all<PostRow>();
  return json({ posts: results.map((r) => toApi(r, me)) });
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

async function listMonthRecords(req: Request, env: Env, url: URL) {
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  const cohort = url.searchParams.get("cohort");
  if (!MONTH.test(from) || !MONTH.test(to) || from > to) {
    throw new HttpError(400, "from, to 값이 필요해요 (YYYY-MM)");
  }
  if (cohort !== null && !MONTH.test(cohort)) {
    throw new HttpError(400, "cohort 값이 잘못됐어요");
  }
  const me = await authorOf(req);
  const { results } = await env.DB.prepare(
    `${SELECT_POST}
     WHERE p.kind = 'record' AND p.status = 'visible'
       AND p.song_key IS NULL AND p.event_id IS NULL
       AND p.about_month BETWEEN ?2 AND ?3
       AND (?4 IS NULL OR p.cohort_month = ?4)
     ORDER BY p.about_month, p.like_count DESC, p.created_at DESC
     LIMIT ?5`,
  )
    .bind(me ?? "", from, to, cohort, TIMELINE_LIMIT)
    .all<PostRow>();
  return json({ posts: results.map((r) => toApi(r, me)) });
}

/** The caller's own 한마디 across every 계급·호봉, newest first. */
async function listMyLetters(req: Request, env: Env) {
  const me = await authorOf(req);
  if (!me) return json({ posts: [] });
  const { results } = await env.DB.prepare(
    `${SELECT_POST}
     WHERE p.kind = 'letter' AND p.author_id = ?1 AND p.status = 'visible'
     ORDER BY p.created_at DESC
     LIMIT 50`,
  )
    .bind(me)
    .all<PostRow>();
  return json({ posts: results.map((r) => toApi(r, me)) });
}

/** 한마디 for one 계급·호봉, most liked then newest. */
async function listLetters(req: Request, env: Env, url: URL) {
  if (url.searchParams.get("mine") === "1") return listMyLetters(req, env);
  const rank = z.enum(POST_RANKS).safeParse(url.searchParams.get("rank"));
  const hobong = Number(url.searchParams.get("hobong"));
  if (!rank.success || !Number.isInteger(hobong) || hobong < 1 || hobong > 12) {
    throw new HttpError(400, "rank, hobong 값이 필요해요");
  }
  const me = await authorOf(req);
  const { results } = await env.DB.prepare(
    `${SELECT_POST}
     WHERE p.kind = 'letter' AND p.rank = ?2 AND p.hobong = ?3
       AND p.status = 'visible'
     ORDER BY p.like_count DESC, p.created_at DESC
     LIMIT 50`,
  )
    .bind(me ?? "", rank.data, hobong)
    .all<PostRow>();
  return json({ posts: results.map((r) => toApi(r, me)) });
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

async function createLetter(env: Env, req: Request, raw: unknown) {
  const parsed = NewLetter.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(
      400,
      parsed.error.issues[0]?.message ?? "잘못된 요청이에요",
    );
  }
  const input = parsed.data;
  const me = await writer(req, env.DB);
  await checkLimits(env.DB, me);
  // Reported (hidden) ones still count, so hiding doesn't free a slot.
  const mine = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM posts
     WHERE kind = 'letter' AND author_id = ? AND rank = ? AND hobong = ?
       AND status <> 'deleted'`,
  )
    .bind(me, input.rank, input.hobong)
    .first<{ n: number }>();
  if ((mine?.n ?? 0) >= LETTERS_PER_SLOT) {
    throw new HttpError(
      409,
      `${input.rank} ${input.hobong}호봉에는 ${LETTERS_PER_SLOT}개까지 남길 수 있어요`,
    );
  }
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO posts (id, kind, body, rank, hobong, author_id, cohort_month,
                        branch, is_reserve)
     VALUES (?, 'letter', ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      input.body,
      input.rank,
      input.hobong,
      me,
      input.cohortMonth,
      input.branch,
      input.isReserve ? 1 : 0,
    )
    .run();
  const row = await env.DB.prepare(`${SELECT_POST} WHERE p.id = ?2`)
    .bind(me, id)
    .first<PostRow>();
  return json({ post: toApi(row!, me) }, 201);
}

async function createPost(req: Request, env: Env) {
  const raw = await readJson(req);
  return raw &&
    typeof raw === "object" &&
    "kind" in raw &&
    raw.kind === "letter"
    ? createLetter(env, req, raw)
    : createRecord(req, env, raw);
}

async function createRecord(req: Request, env: Env, raw: unknown) {
  const parsed = (
    raw && typeof raw === "object" && "song" in raw
      ? NewSongRecord
      : NewMonthRecord
  ).safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(
      400,
      parsed.error.issues[0]?.message ?? "잘못된 요청이에요",
    );
  }
  const input = parsed.data;
  const me = await writer(req, env.DB);
  await checkLimits(env.DB, me);

  // A song memory hangs on the song, a month record only on its month
  const song = "song" in input ? input.song : null;
  const hobong = "hobong" in input ? (input.hobong ?? null) : null;

  const id = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO posts (id, kind, body, song_key, song_title, song_artist,
                        rank, hobong, about_month, author_id, cohort_month,
                        branch, is_reserve)
     VALUES (?, 'record', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      input.body,
      song?.key ?? null,
      song?.title ?? null,
      song?.artist ?? null,
      input.rank,
      hobong,
      input.aboutMonth,
      me,
      input.cohortMonth,
      input.branch,
      input.isReserve ? 1 : 0,
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
  const res = await env.DB.prepare(
    "UPDATE posts SET status = 'deleted' WHERE id = ? AND author_id = ? AND status <> 'deleted'",
  )
    .bind(id, me)
    .run();
  if (!res.meta.changes) throw new HttpError(404, "지울 수 있는 글이 아니에요");
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
  if (resource !== "posts" || parts.length > 4)
    throw new HttpError(404, "없는 주소예요");

  if (!id) {
    if (req.method === "GET") {
      const song = url.searchParams.get("song");
      if (song) return listSongRecords(req, env, url, song);
      if (url.searchParams.get("kind") === "letter") {
        return listLetters(req, env, url);
      }
      return listMonthRecords(req, env, url);
    }
    if (req.method === "POST") return createPost(req, env);
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
