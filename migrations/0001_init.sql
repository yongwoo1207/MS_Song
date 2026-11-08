-- 입대곡 D1 schema v1
--
-- What lives where
--   Charts and songs  : NOT in D1. They stay static JSON in public/data,
--                       refreshed weekly by GitHub Actions. Posts refer to a
--                       song by its key ("artist|title") plus a title/artist
--                       snapshot, so the DB never has to join chart data.
--   Events            : curated facts (e.g. 2020-02 코로나19 휴가 통제).
--                       Written by the operator only.
--   Posts             : EVERY piece of user text, in one table, told apart
--                       by `kind`:
--                         record = 기록. Written under a song (now) or an
--                                  event (later).
--                         letter = 후임에게 한마디. Aimed at a 호봉
--                                  ("일병 3호봉"); shown to serving users in
--                                  that 호봉.
--                         talk   = 커뮤니티 글.
--                         reply  = 댓글 on a talk or letter.
--                       One table means likes, reports, hiding and rate
--                       limits work the same way for all of them.
--   Authors           : anonymous. A random token kept on the device; only
--                       its SHA-256 hash is stored. No names, no login.
--
-- "Moment" columns (rank, hobong) say WHEN in service a post is about:
--   record → the rank the author held when the song was on the chart
--   letter → the 호봉 it is addressed to
--   talk   → the author's own 호봉 when writing (NULL for 예비역)
-- 호봉 = month within a rank, counted from that rank's promotion day
-- (일병 진급일 ~ 한 달 뒤 전날 = 일병 1호봉).

CREATE TABLE authors (
  id          TEXT PRIMARY KEY,               -- sha256(device token), hex
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  banned      INTEGER NOT NULL DEFAULT 0      -- 1 = can no longer post
);

CREATE TABLE events (
  id          TEXT PRIMARY KEY,               -- slug, e.g. 'covid19-leave-ban'
  month       TEXT NOT NULL,                  -- 'YYYY-MM'
  title       TEXT NOT NULL,                  -- '코로나19 확산'
  summary     TEXT NOT NULL,                  -- effect on service, facts only
  scope       TEXT NOT NULL DEFAULT '전 군종', -- '전 군종' | '육군' | ...
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX idx_events_month ON events(month);

CREATE TABLE posts (
  id            TEXT PRIMARY KEY,             -- uuid
  kind          TEXT NOT NULL CHECK (kind IN ('record', 'letter', 'talk', 'reply')),
  body          TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 500),

  -- What the post hangs on (which columns are set depends on kind)
  song_key      TEXT,                         -- record on a song: "artist|title"
  song_title    TEXT,
  song_artist   TEXT,
  event_id      TEXT REFERENCES events(id),   -- record on an event
  about_month   TEXT,                         -- 'YYYY-MM' timeline chapter, when known
  parent_id     TEXT REFERENCES posts(id),    -- reply

  -- Moment in service (see header)
  rank          TEXT CHECK (rank IN ('이병', '일병', '상병', '병장')),
  hobong        INTEGER CHECK (hobong BETWEEN 1 AND 12),

  -- Author snapshot, frozen at writing time
  author_id     TEXT NOT NULL REFERENCES authors(id),
  cohort_month  TEXT NOT NULL,                -- 'YYYY-MM' → "2021년 10월 군번"
  branch        TEXT NOT NULL CHECK (branch IN ('육군', '해군', '공군', '해병대')),
  is_reserve    INTEGER NOT NULL DEFAULT 0,   -- 1 → "· 예비역"

  -- Counters (kept in sync by the API) and moderation
  like_count    INTEGER NOT NULL DEFAULT 0,
  reply_count   INTEGER NOT NULL DEFAULT 0,
  report_count  INTEGER NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'visible'
                CHECK (status IN ('visible', 'hidden', 'deleted')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),

  CHECK (kind <> 'record' OR (
    ((song_key IS NOT NULL) + (event_id IS NOT NULL)) = 1 AND rank IS NOT NULL)),
  CHECK (song_key IS NULL OR (song_title IS NOT NULL AND song_artist IS NOT NULL)),
  CHECK (kind <> 'letter' OR (rank IS NOT NULL AND hobong IS NOT NULL)),
  CHECK (kind <> 'reply'  OR parent_id IS NOT NULL)
);

-- One index per screen that reads posts
CREATE INDEX idx_posts_song     ON posts(song_key, created_at DESC)
  WHERE kind = 'record' AND status = 'visible';           -- 곡 아래 기록
CREATE INDEX idx_posts_event    ON posts(event_id, created_at DESC)
  WHERE kind = 'record' AND status = 'visible';           -- 사건 상세
CREATE INDEX idx_posts_month    ON posts(about_month, like_count DESC)
  WHERE kind = 'record' AND status = 'visible';           -- 타임라인 월 카드
CREATE INDEX idx_posts_hobong   ON posts(rank, hobong, created_at DESC)
  WHERE kind IN ('letter', 'talk') AND status = 'visible'; -- 홈 한마디, 커뮤니티 내 구간
CREATE INDEX idx_posts_cohort   ON posts(cohort_month, created_at DESC)
  WHERE kind IN ('letter', 'talk') AND status = 'visible'; -- 커뮤니티 같은 기수
CREATE INDEX idx_posts_feed     ON posts(kind, created_at DESC)
  WHERE status = 'visible';                               -- 커뮤니티 전체
CREATE INDEX idx_posts_replies  ON posts(parent_id, created_at)
  WHERE kind = 'reply';                                   -- 댓글
CREATE INDEX idx_posts_author   ON posts(author_id, created_at DESC); -- 내 글, 도배 제한

CREATE TABLE likes (
  post_id     TEXT NOT NULL REFERENCES posts(id),
  author_id   TEXT NOT NULL REFERENCES authors(id),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (post_id, author_id)                         -- one like per person
);

CREATE TABLE reports (
  post_id     TEXT NOT NULL REFERENCES posts(id),
  author_id   TEXT NOT NULL REFERENCES authors(id),
  reason      TEXT NOT NULL CHECK (reason IN ('보안', '욕설·비방', '광고', '기타')),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (post_id, author_id)                         -- one report per person
);
