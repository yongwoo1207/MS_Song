-- Clean-up after the 한마디 features were removed.
--
--   letter  → gone. 후임에게 한마디 rows are DELETED, with their likes,
--             reports and notifications. This cannot be undone.
--   record  → now always a memory under a song (song, rank, month set).
--   post    → NEW kind: a 커뮤니티 글 on no song. Old records without a song
--             (커뮤니티 글 and old timeline month records) become posts.
--   talk    → a 선후임 소통 글 (현역 and 예비역 talk), replies under it.
--   hobong, event_id → dropped (only letters used hobong, nothing used
--             event_id). The events table itself stays for the timeline.
--
-- SQLite cannot change a CHECK in place, so posts is rebuilt the same way
-- as in 0003: copy posts, likes and reports aside, drop, recreate, refill.
PRAGMA defer_foreign_keys = ON;

CREATE TABLE tmp_posts AS SELECT * FROM posts WHERE kind <> 'letter';
CREATE TABLE tmp_likes AS SELECT * FROM likes;
CREATE TABLE tmp_reports AS SELECT * FROM reports;
DELETE FROM notifications
  WHERE post_id NOT IN (SELECT id FROM tmp_posts);
DROP TABLE likes;
DROP TABLE reports;
DROP TABLE posts;

CREATE TABLE posts (
  id            TEXT PRIMARY KEY,               -- uuid
  kind          TEXT NOT NULL CHECK (kind IN ('record', 'post', 'talk', 'reply')),
  body          TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 500),

  song_key      TEXT,                           -- record: "artist|title"
  song_title    TEXT,
  song_artist   TEXT,
  about_month   TEXT,                           -- record: chart month 'YYYY-MM'
  parent_id     TEXT REFERENCES posts(id),      -- reply: the talk it answers

  rank          TEXT CHECK (rank IN ('이병', '일병', '상병', '병장')),

  author_id     TEXT NOT NULL REFERENCES authors(id),
  cohort_month  TEXT NOT NULL,                  -- 'YYYY-MM' 군번
  branch        TEXT NOT NULL CHECK (branch IN ('육군', '해군', '공군', '해병대')),
  is_reserve    INTEGER NOT NULL DEFAULT 0,

  like_count    INTEGER NOT NULL DEFAULT 0,
  reply_count   INTEGER NOT NULL DEFAULT 0,
  report_count  INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'visible'
                CHECK (status IN ('visible', 'hidden', 'deleted')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  CHECK (kind <> 'record' OR (song_key IS NOT NULL AND song_title IS NOT NULL
         AND song_artist IS NOT NULL AND rank IS NOT NULL
         AND about_month IS NOT NULL)),
  CHECK (kind <> 'post' OR rank IS NOT NULL),
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

INSERT INTO posts SELECT
  id,
  CASE WHEN kind = 'record' AND song_key IS NULL THEN 'post' ELSE kind END,
  body, song_key, song_title, song_artist,
  CASE WHEN kind = 'record' AND song_key IS NOT NULL
       THEN COALESCE(about_month, substr(created_at, 1, 7)) END,
  parent_id, rank, author_id, cohort_month, branch, is_reserve,
  like_count, reply_count, report_count, status, created_at
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

-- One index per list that reads posts
CREATE INDEX idx_posts_song    ON posts(song_key, created_at DESC)
  WHERE kind = 'record' AND status = 'visible';           -- 곡 아래 추억
CREATE INDEX idx_posts_month   ON posts(about_month, like_count DESC)
  WHERE kind = 'record' AND status = 'visible';           -- 타임라인
CREATE INDEX idx_posts_feed    ON posts(kind, created_at DESC)
  WHERE status = 'visible';                               -- 커뮤니티
CREATE INDEX idx_posts_replies ON posts(parent_id, created_at)
  WHERE kind = 'reply';                                   -- 답글
CREATE INDEX idx_posts_author  ON posts(author_id, created_at DESC); -- 내 글, 도배 제한
