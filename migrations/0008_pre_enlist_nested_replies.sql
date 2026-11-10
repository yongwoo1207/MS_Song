-- 입대 예정자 can write, and 댓글 can be answered (대댓글).
--
--   days_to_enlist → NEW. Days left to 입대 when a 입대 예정자 wrote the
--                    post ("입대 23일 전"). NULL for 현역 and 예비역.
--   reply_to       → NEW. 대댓글 only: the 댓글 it answers. Always a
--                    top-level 댓글 of the same thread (one level deep),
--                    while parent_id stays the thread. NULL otherwise.
--
-- Plain ADD COLUMN, so no rebuild and no rows are touched.
ALTER TABLE posts ADD COLUMN days_to_enlist INTEGER
  CHECK (days_to_enlist IS NULL OR days_to_enlist >= 0);
ALTER TABLE posts ADD COLUMN reply_to TEXT;
