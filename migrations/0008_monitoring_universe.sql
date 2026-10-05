-- PyOrex HUB monitored source universe v1
-- Upserts primary/project sources from the current opportunity universe.
UPDATE hub_sources SET priority=95,check_frequency='weekly',language='en',enabled=1 WHERE name IN ('AusQuest','Condor Resources','Tier One Silver','Xali Gold','Panoro Minerals','Palamina / Colt Silver','Pecoy Copper');
UPDATE hub_sources SET priority=85,check_frequency='weekly',language='en',enabled=1 WHERE name IN ('Radius Gold','Magma Silver','Chakana Copper','Turmalina Metals','Aftermath Silver','Silver X Mining','Element79 Gold','Patriot Resources','Peruvian Metals','Palamina');
UPDATE hub_sources SET priority=80,check_frequency='weekly',language='en',enabled=1 WHERE source_kind='company_news' AND priority=50;
UPDATE hub_sources SET next_check_at=NULL WHERE enabled=1;
