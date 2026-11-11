-- A heart on a song now shows on the 커뮤니티 음악 board, so it keeps what
-- the board shows: the song's name and who hearted it (as a post would).
-- Older hearts keep NULLs and are left off the board.
ALTER TABLE song_likes ADD COLUMN song_title TEXT;
ALTER TABLE song_likes ADD COLUMN song_artist TEXT;
ALTER TABLE song_likes ADD COLUMN rank TEXT;
ALTER TABLE song_likes ADD COLUMN cohort_month TEXT;
ALTER TABLE song_likes ADD COLUMN branch TEXT;
ALTER TABLE song_likes ADD COLUMN is_reserve INTEGER;
ALTER TABLE song_likes ADD COLUMN days_to_enlist INTEGER;

CREATE INDEX idx_song_likes_recent ON song_likes(created_at DESC)
  WHERE song_title IS NOT NULL;
