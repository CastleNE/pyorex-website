-- PyOrex HUB historical intelligence archive v1
-- Append-only events: old intelligence is preserved instead of overwritten.
CREATE TABLE IF NOT EXISTS hub_companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  company_type TEXT NOT NULL CHECK(company_type IN ('junior','major','mid-tier','private','other')),
  website TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hub_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  company_id INTEGER,
  country TEXT NOT NULL DEFAULT 'Peru',
  region TEXT,
  commodities TEXT,
  deposit_model TEXT,
  stage TEXT,
  status TEXT,
  first_tracked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_checked_at TEXT,
  last_material_update_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES hub_companies(id)
);

CREATE TABLE IF NOT EXISTS hub_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL UNIQUE,
  project_id INTEGER,
  company_id INTEGER,
  event_date TEXT NOT NULL,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK(quarter BETWEEN 1 AND 4),
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  why_it_matters TEXT,
  commodities TEXT,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'primary',
  relevance TEXT NOT NULL DEFAULT 'material',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(project_id) REFERENCES hub_projects(id),
  FOREIGN KEY(company_id) REFERENCES hub_companies(id)
);
CREATE INDEX IF NOT EXISTS idx_hub_events_date ON hub_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_hub_events_period ON hub_events(year,quarter,event_date DESC);
CREATE INDEX IF NOT EXISTS idx_hub_events_project ON hub_events(project_id,event_date DESC);
CREATE INDEX IF NOT EXISTS idx_hub_events_company ON hub_events(company_id,event_date DESC);
CREATE INDEX IF NOT EXISTS idx_hub_events_type ON hub_events(event_type,event_date DESC);

CREATE TABLE IF NOT EXISTS hub_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER,
  project_id INTEGER,
  name TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  source_kind TEXT NOT NULL DEFAULT 'company_news',
  enabled INTEGER NOT NULL DEFAULT 1,
  last_checked_at TEXT,
  last_success_at TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(company_id) REFERENCES hub_companies(id),
  FOREIGN KEY(project_id) REFERENCES hub_projects(id)
);

CREATE TABLE IF NOT EXISTS hub_scan_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  sources_checked INTEGER NOT NULL DEFAULT 0,
  candidates_seen INTEGER NOT NULL DEFAULT 0,
  new_events INTEGER NOT NULL DEFAULT 0,
  duplicates INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0
);
