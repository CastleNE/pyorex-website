-- PyOrex Exploration Intelligence / D1 schema v1
CREATE TABLE IF NOT EXISTS radar_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL UNIQUE,
  canonical_url TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_type TEXT,
  source_id TEXT,
  published_at TEXT,
  fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  title TEXT NOT NULL,
  raw_excerpt TEXT,
  category TEXT,
  country TEXT,
  region TEXT,
  company TEXT,
  project TEXT,
  commodities TEXT,
  deposit_models TEXT,
  stage TEXT,
  opportunity_type TEXT,
  score INTEGER NOT NULL DEFAULT 0,
  score_reasons TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewed','approved','published','rejected')),
  summary TEXT,
  why_it_matters TEXT,
  language TEXT DEFAULT 'en',
  reviewed_at TEXT,
  published_to TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_radar_status_score ON radar_items(status, score DESC);
CREATE INDEX IF NOT EXISTS idx_radar_published ON radar_items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_radar_category ON radar_items(category);
CREATE INDEX IF NOT EXISTS idx_radar_country ON radar_items(country);

CREATE TABLE IF NOT EXISTS radar_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  url TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  reliability_tier TEXT NOT NULL DEFAULT 'B',
  last_fetch_at TEXT,
  last_success_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS radar_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  candidates_seen INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  duplicate_count INTEGER NOT NULL DEFAULT 0,
  error TEXT
);
