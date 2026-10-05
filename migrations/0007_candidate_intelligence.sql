-- PyOrex HUB candidate intelligence metadata
ALTER TABLE hub_candidates ADD COLUMN materiality_score INTEGER;
ALTER TABLE hub_candidates ADD COLUMN classification TEXT;
ALTER TABLE hub_candidates ADD COLUMN rationale TEXT;
ALTER TABLE hub_candidates ADD COLUMN reviewed_by TEXT;
