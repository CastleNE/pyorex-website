-- PyOrex HUB source-change queue
-- Keeps discovery separate from publication: collector detects change, intelligence step validates it.
CREATE TABLE IF NOT EXISTS hub_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL UNIQUE,
  source_id INTEGER NOT NULL,
  detected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  source_url TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','error')),
  project_hint TEXT,
  company_hint TEXT,
  processed_at TEXT,
  event_id INTEGER,
  error TEXT,
  FOREIGN KEY(source_id) REFERENCES hub_sources(id),
  FOREIGN KEY(event_id) REFERENCES hub_events(id)
);
CREATE INDEX IF NOT EXISTS idx_hub_candidates_status ON hub_candidates(status,detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_hub_candidates_source ON hub_candidates(source_id,detected_at DESC);
