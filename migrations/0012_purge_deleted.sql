-- 삭제 시각. 글·댓글을 지우면 바로 안 보이게 되고, 30일이 지나면 예약
-- 작업(worker scheduled)이 DB에서 완전히 지운다 — 개인정보처리방침의
-- 보유기간. 이미 삭제 표시만 되어 있던 글은 지금부터 30일을 센다.
ALTER TABLE posts ADD COLUMN deleted_at TEXT;

UPDATE posts
  SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE status = 'deleted' AND deleted_at IS NULL;

CREATE INDEX idx_posts_purge ON posts(deleted_at)
  WHERE status = 'deleted';
