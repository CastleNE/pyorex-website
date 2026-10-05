-- PyOrex HUB automation + bilingual intelligence layer
-- Additive migration: safe for the already populated historical archive.

ALTER TABLE hub_events ADD COLUMN title_es TEXT;
ALTER TABLE hub_events ADD COLUMN summary_es TEXT;
ALTER TABLE hub_events ADD COLUMN why_it_matters_es TEXT;
ALTER TABLE hub_events ADD COLUMN verified_at TEXT;
ALTER TABLE hub_events ADD COLUMN ingestion_method TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE hub_sources ADD COLUMN priority INTEGER NOT NULL DEFAULT 50;
ALTER TABLE hub_sources ADD COLUMN check_frequency TEXT NOT NULL DEFAULT 'weekly';
ALTER TABLE hub_sources ADD COLUMN language TEXT;
ALTER TABLE hub_sources ADD COLUMN feed_url TEXT;
ALTER TABLE hub_sources ADD COLUMN last_item_url TEXT;
ALTER TABLE hub_sources ADD COLUMN last_item_published_at TEXT;
ALTER TABLE hub_sources ADD COLUMN consecutive_errors INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hub_sources ADD COLUMN next_check_at TEXT;

CREATE INDEX IF NOT EXISTS idx_hub_sources_schedule ON hub_sources(enabled,next_check_at,priority);
CREATE INDEX IF NOT EXISTS idx_hub_events_verified ON hub_events(verified_at);
