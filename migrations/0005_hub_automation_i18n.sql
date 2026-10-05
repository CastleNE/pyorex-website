-- PyOrex HUB automation + bilingual intelligence layer
-- Idempotent additive migration for production D1.

ALTER TABLE hub_events ADD COLUMN IF NOT EXISTS title_es TEXT;
ALTER TABLE hub_events ADD COLUMN IF NOT EXISTS summary_es TEXT;
ALTER TABLE hub_events ADD COLUMN IF NOT EXISTS why_it_matters_es TEXT;
ALTER TABLE hub_events ADD COLUMN IF NOT EXISTS verified_at TEXT;
ALTER TABLE hub_events ADD COLUMN IF NOT EXISTS ingestion_method TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE hub_sources ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 50;
ALTER TABLE hub_sources ADD COLUMN IF NOT EXISTS check_frequency TEXT NOT NULL DEFAULT 'weekly';
ALTER TABLE hub_sources ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE hub_sources ADD COLUMN IF NOT EXISTS feed_url TEXT;
ALTER TABLE hub_sources ADD COLUMN IF NOT EXISTS last_item_url TEXT;
ALTER TABLE hub_sources ADD COLUMN IF NOT EXISTS last_item_published_at TEXT;
ALTER TABLE hub_sources ADD COLUMN IF NOT EXISTS consecutive_errors INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hub_sources ADD COLUMN IF NOT EXISTS next_check_at TEXT;

CREATE INDEX IF NOT EXISTS idx_hub_sources_schedule ON hub_sources(enabled,next_check_at,priority);
CREATE INDEX IF NOT EXISTS idx_hub_events_verified ON hub_events(verified_at);
