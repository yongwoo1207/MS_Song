-- Events get an exact day (when known) and the source the facts come from.
ALTER TABLE events ADD COLUMN date TEXT;        -- 'YYYY-MM-DD', NULL when only the month is known
ALTER TABLE events ADD COLUMN source_url TEXT;  -- where the facts were checked
