-- 군 종류 adds 카투사 and 공익 (사회복무요원).
--
--   branch → CHECK now also allows '카투사' and '공익'.
--   idx_posts_month is not recreated: it served the 타임라인, which is gone.
--
-- SQLite cannot change a CHECK in place, so posts is rebuilt as in 0007:
-- copy posts, likes and reports aside, drop, recreate, refill. No rows
-- are deleted.
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

  CHECK (kind <> 'record' OR (song_key IS NOT NULL AND song_title IS NOT NULL
         AND song_artist IS NOT NULL AND rank IS NOT NULL
         AND about_month IS NOT NULL)),
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
                   about_month, parent_id, rank, author_id, cohort_month,
                   branch, is_reserve, like_count, reply_count, report_count,
                   status, created_at, days_to_enlist, reply_to)
  SELECT id, kind, title, body, song_key, song_title, song_artist,
         about_month, parent_id, rank, author_id, cohort_month,
         branch, is_reserve, like_count, reply_count, report_count,
         status, created_at, days_to_enlist, reply_to
  FROM tmp_posts;
INSERT INTO likes (post_id, author_id, created_at)
  SELECT post_id, author_id, created_at FROM tmp_likes;
INSERT INTO reports (post_id, author_id, reason, created_at)
  SELECT post_id, author_id, reason, created_at FROM tmp_reports;
DROP TABLE tmp_posts;
DROP TABLE tmp_likes;
DROP TABLE tmp_reports;

-- One index per list that reads posts
CREATE INDEX idx_posts_song    ON posts(song_key, created_at DESC)
  WHERE kind = 'record' AND status = 'visible';           -- 곡 아래 추억
CREATE INDEX idx_posts_feed    ON posts(kind, created_at DESC)
  WHERE status = 'visible';                               -- 커뮤니티
CREATE INDEX idx_posts_replies ON posts(parent_id, created_at)
  WHERE kind = 'reply';                                   -- 댓글
CREATE INDEX idx_posts_author  ON posts(author_id, created_at DESC); -- 내 글, 도배 제한
