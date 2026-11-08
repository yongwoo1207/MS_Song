-- Notifications for a post's author: likes now, replies later.
-- One row per (type, post, actor), so liking and unliking over and over
-- never piles up rows. post_id has no FOREIGN KEY on purpose: rebuilding
-- posts (as 0003 did) would otherwise have to copy this table too.
CREATE TABLE notifications (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_id  TEXT NOT NULL REFERENCES authors(id),
  type          TEXT NOT NULL CHECK (type IN ('like', 'reply')),
  post_id       TEXT NOT NULL,
  actor_id      TEXT NOT NULL REFERENCES authors(id),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  read_at       TEXT,
  UNIQUE (type, post_id, actor_id)
);

CREATE INDEX idx_notifications_recipient
  ON notifications(recipient_id, created_at DESC);
