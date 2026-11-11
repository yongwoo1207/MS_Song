-- 글과 댓글 수정: when the writer last edited it (NULL: never edited).
ALTER TABLE posts ADD COLUMN edited_at TEXT;
