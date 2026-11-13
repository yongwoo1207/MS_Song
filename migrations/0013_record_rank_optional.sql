-- 한마디 and 노래 좋아요 left on someone else's 입대곡 may name no rank.
--
-- Since /songs shows the charts of any 입대일, a heart or a 한마디 can come
-- from someone who holds no rank of their own right now (예비역, 입대 예정자).
-- Writing the rank of the chart they happened to be looking at would claim
-- they were that rank, so `rank` is now NULL in that case: it means "the rank
-- the writer held over this song", nothing more.
--
-- Only the record CHECK changes (rank IS NOT NULL goes away). SQLite cannot
-- change a CHECK in place, so posts is rebuilt as in 0006: copy aside, drop,
-- recreate, refill. Existing rows all keep their rank.
PRAGMA defer_foreign_keys = ON;

CREATE TABLE tmp_posts AS SELECT * FROM posts;
CREATE TABLE tmp_likes AS SELECT * FROM likes;
CREATE TABLE tmp_reports AS SELECT * FROM reports;
DROP TABLE likes;
DROP TABLE reports;
DROP TABLE posts;

CREATE TABLE posts (
  id             TEXT PRIMARY KEY,              -- uuid
  kind           TEXT NOT NULL CHECK (kind IN ('record', 'post', 'talk', 'reply')),
  title          TEXT CHECK (title IS NULL OR length(title) BETWEEN 1 AND 60),
  body           TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 500),

  song_key       TEXT,                          -- record: "artist|title"
  song_title     TEXT,
  song_artist    TEXT,
  about_month    TEXT,                          -- record: chart month 'YYYY-MM'
  parent_id      TEXT REFERENCES posts(id),     -- reply: the post it answers

  -- The rank the writer held over this post's song or moment; NULL when
  -- they held none (예비역, 입대 예정자, or someone else's chart)
  rank           TEXT CHECK (rank IN ('이병', '일병', '상병', '병장')),

  author_id      TEXT NOT NULL REFERENCES authors(id),
  cohort_month   TEXT NOT NULL,                 -- 'YYYY-MM' 군번
  branch         TEXT NOT NULL
                 CHECK (branch IN ('육군', '해군', '공군', '해병대', '카투사', '공익')),
  is_reserve     INTEGER NOT NULL DEFAULT 0,

  like_count     INTEGER NOT NULL DEFAULT 0,
  reply_count    INTEGER NOT NULL DEFAULT 0,
  report_count   INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'visible'
                 CHECK (status IN ('visible', 'hidden', 'deleted')),
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  days_to_enlist INTEGER
                 CHECK (days_to_enlist IS NULL OR days_to_enlist >= 0), -- 입대 예정자
  reply_to       TEXT,                          -- 대댓글: the 댓글 it answers
  edited_at      TEXT,
  deleted_at     TEXT,

  CHECK (kind <> 'record' OR (song_key IS NOT NULL AND song_title IS NOT NULL
         AND song_artist IS NOT NULL AND about_month IS NOT NULL)),
  CHECK (kind <> 'reply' OR parent_id IS NOT NULL)
);

CREATE TABLE likes (
  post_id     TEXT NOT NULL REFERENCES posts(id),
  author_id   TEXT NOT NULL REFERENCES authors(id),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (post_id, author_id)
);

CREATE TABLE reports (
  post_id     TEXT NOT NULL REFERENCES posts(id),
  author_id   TEXT NOT NULL REFERENCES authors(id),
  reason      TEXT NOT NULL CHECK (reason IN ('보안', '욕설·비방', '광고', '기타')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (post_id, author_id)
);

INSERT INTO posts (id, kind, title, body, song_key, song_title, song_artist,
  about_month, parent_id, rank, author_id, cohort_month, branch, is_reserve,
  like_count, reply_count, report_count, status, created_at, days_to_enlist,
  reply_to, edited_at, deleted_at)
  SELECT id, kind, title, body, song_key, song_title, song_artist,
    about_month, parent_id, rank, author_id, cohort_month, branch, is_reserve,
    like_count, reply_count, report_count, status, created_at, days_to_enlist,
    reply_to, edited_at, deleted_at
  FROM tmp_posts;
INSERT INTO likes (post_id, author_id, created_at)
  SELECT post_id, author_id, created_at FROM tmp_likes
  WHERE post_id IN (SELECT id FROM posts);
INSERT INTO reports (post_id, author_id, reason, created_at)
  SELECT post_id, author_id, reason, created_at FROM tmp_reports
  WHERE post_id IN (SELECT id FROM posts);
DROP TABLE tmp_posts;
DROP TABLE tmp_likes;
DROP TABLE tmp_reports;

-- Same indexes as before the rebuild
CREATE INDEX idx_posts_song    ON posts(song_key, created_at DESC)
  WHERE kind = 'record' AND status = 'visible';           -- 곡 아래 한마디
CREATE INDEX idx_posts_feed    ON posts(kind, created_at DESC)
  WHERE status = 'visible';                               -- 커뮤니티
CREATE INDEX idx_posts_replies ON posts(parent_id, created_at)
  WHERE kind = 'reply';                                   -- 댓글
CREATE INDEX idx_posts_author  ON posts(author_id, created_at DESC); -- 내 글, 도배 제한
CREATE INDEX idx_posts_purge   ON posts(deleted_at)
  WHERE status = 'deleted';                               -- 파기 대상
