-- Records can now be written to a timeline month directly (no song, no
-- event). SQLite cannot change a CHECK in place, so posts is rebuilt with:
--   record → at most one of song_key / event_id, rank set, and something to
--            file it under (song, event or about_month).
-- D1 will not drop posts while likes / reports reference it, so all three
-- are copied to plain tables, dropped, recreated and filled again.
PRAGMA defer_foreign_keys = ON;

CREATE TABLE tmp_posts AS SELECT * FROM posts;
CREATE TABLE tmp_likes AS SELECT * FROM likes;
CREATE TABLE tmp_reports AS SELECT * FROM reports;
DROP TABLE likes;
DROP TABLE reports;
DROP TABLE posts;

CREATE TABLE posts (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL CHECK (kind IN ('record', 'letter', 'talk', 'reply')),
  body          TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 500),

  song_key      TEXT,                         -- record on a song: "artist|title"
  song_title    TEXT,
  song_artist   TEXT,
  event_id      TEXT REFERENCES events(id),   -- record on an event (unused for now)
  about_month   TEXT,                         -- 'YYYY-MM' timeline month
  parent_id     TEXT REFERENCES posts(id),    -- reply

  rank          TEXT CHECK (rank IN ('이병', '일병', '상병', '병장')),
  hobong        INTEGER CHECK (hobong BETWEEN 1 AND 12),

  author_id     TEXT NOT NULL REFERENCES authors(id),
  cohort_month  TEXT NOT NULL,
  branch        TEXT NOT NULL CHECK (branch IN ('육군', '해군', '공군', '해병대')),
  is_reserve    INTEGER NOT NULL DEFAULT 0,

  like_count    INTEGER NOT NULL DEFAULT 0,
  reply_count   INTEGER NOT NULL DEFAULT 0,
  report_count  INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'visible'
                CHECK (status IN ('visible', 'hidden', 'deleted')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  CHECK (kind <> 'record' OR (
    ((song_key IS NOT NULL) + (event_id IS NOT NULL)) <= 1
    AND (song_key IS NOT NULL OR event_id IS NOT NULL OR about_month IS NOT NULL)
    AND rank IS NOT NULL)),
  CHECK (song_key IS NULL OR (song_title IS NOT NULL AND song_artist IS NOT NULL)),
  CHECK (kind <> 'letter' OR (rank IS NOT NULL AND hobong IS NOT NULL)),
  CHECK (kind <> 'reply'  OR parent_id IS NOT NULL)
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
  id, kind, body, song_key, song_title, song_artist, event_id, about_month,
  parent_id, rank, hobong, author_id, cohort_month, branch, is_reserve,
  like_count, reply_count, report_count, status, created_at
FROM tmp_posts;
INSERT INTO likes (post_id, author_id, created_at)
  SELECT post_id, author_id, created_at FROM tmp_likes;
INSERT INTO reports (post_id, author_id, reason, created_at)
  SELECT post_id, author_id, reason, created_at FROM tmp_reports;
DROP TABLE tmp_posts;
DROP TABLE tmp_likes;
DROP TABLE tmp_reports;

CREATE INDEX idx_posts_song     ON posts(song_key, created_at DESC)
  WHERE kind = 'record' AND status = 'visible';           -- 곡 아래 기록
CREATE INDEX idx_posts_event    ON posts(event_id, created_at DESC)
  WHERE kind = 'record' AND status = 'visible';
CREATE INDEX idx_posts_month    ON posts(about_month, like_count DESC)
  WHERE kind = 'record' AND status = 'visible'
    AND song_key IS NULL AND event_id IS NULL;            -- 타임라인 월 기록
CREATE INDEX idx_posts_hobong   ON posts(rank, hobong, created_at DESC)
  WHERE kind IN ('letter', 'talk') AND status = 'visible';
CREATE INDEX idx_posts_cohort   ON posts(cohort_month, created_at DESC)
  WHERE kind IN ('letter', 'talk') AND status = 'visible';
CREATE INDEX idx_posts_feed     ON posts(kind, created_at DESC)
  WHERE status = 'visible';
CREATE INDEX idx_posts_replies  ON posts(parent_id, created_at)
  WHERE kind = 'reply';
CREATE INDEX idx_posts_author   ON posts(author_id, created_at DESC);
