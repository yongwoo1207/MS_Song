-- Hearts on a song itself (not on a memory under it).
-- Songs are not in D1 (static chart JSON), so a song is its key "artist|title".
-- One heart per person per song.

CREATE TABLE song_likes (
  song_key    TEXT NOT NULL,
  author_id   TEXT NOT NULL REFERENCES authors(id),
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (song_key, author_id)
);
CREATE INDEX idx_song_likes_author ON song_likes(author_id);
