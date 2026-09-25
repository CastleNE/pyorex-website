-- PyOrex Knowledge Layer v1
-- Canonical entities are deliberately separated from raw source records.
CREATE TABLE IF NOT EXISTS mineral_entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  region TEXT,
  district TEXT,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('occurrence','prospect','project','deposit','mine','historic_mine')),
  status TEXT,
  commodities TEXT,
  mineralization_style TEXT,
  deposit_model TEXT,
  deposit_size TEXT,
  owner_type TEXT,
  owners TEXT,
  operator TEXT,
  latitude REAL,
  longitude REAL,
  summary TEXT,
  geology TEXT,
  mineralization TEXT,
  history TEXT,
  confidence TEXT NOT NULL DEFAULT 'documented' CHECK(confidence IN ('reported','documented','interpreted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_entities_name ON mineral_entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_country_region ON mineral_entities(country,region);
CREATE INDEX IF NOT EXISTS idx_entities_type ON mineral_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_owner_type ON mineral_entities(owner_type);

CREATE TABLE IF NOT EXISTS source_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  source_layer TEXT,
  source_id TEXT NOT NULL,
  name TEXT,
  latitude REAL,
  longitude REAL,
  commodities TEXT,
  payload TEXT,
  validation_status TEXT,
  source_url TEXT,
  fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source,source_id)
);
CREATE INDEX IF NOT EXISTS idx_source_records_source ON source_records(source,source_layer);
CREATE INDEX IF NOT EXISTS idx_source_records_name ON source_records(name);

CREATE TABLE IF NOT EXISTS entity_sources (
  entity_id INTEGER NOT NULL,
  source_record_id INTEGER NOT NULL,
  match_method TEXT NOT NULL DEFAULT 'manual',
  match_confidence REAL,
  verified INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(entity_id,source_record_id),
  FOREIGN KEY(entity_id) REFERENCES mineral_entities(id),
  FOREIGN KEY(source_record_id) REFERENCES source_records(id)
);

CREATE TABLE IF NOT EXISTS entity_references (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL,
  ref_code TEXT NOT NULL,
  title TEXT NOT NULL,
  publisher TEXT,
  url TEXT NOT NULL,
  ref_type TEXT,
  evidence_level TEXT NOT NULL DEFAULT 'documented',
  UNIQUE(entity_id,ref_code),
  FOREIGN KEY(entity_id) REFERENCES mineral_entities(id)
);
