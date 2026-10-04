-- Seed the monitored universe and persistent historical archive.
-- Safe to re-run after migration 0004.
INSERT OR IGNORE INTO hub_companies(slug,name,company_type) VALUES
('ausquest','AusQuest','junior'),('tier-one-silver','Tier One Silver','junior'),('xali-gold','Xali Gold','junior'),('condor-resources','Condor Resources','junior'),('radius-gold','Radius Gold','junior'),('magma-silver','Magma Silver','junior'),('chakana-copper','Chakana Copper','junior'),('turmalina-metals','Turmalina Metals','junior'),('aftermath-silver','Aftermath Silver','junior'),('silver-x-mining','Silver X Mining','junior'),('element79-gold','Element79 Gold','junior'),('patriot-resources','Patriot Resources','junior'),('pecoy-copper','Pecoy Copper','junior'),('panoro-minerals','Panoro Minerals','junior'),('peruvian-metals','Peruvian Metals','junior'),('palamina','Palamina','junior'),('colt-silver','Colt Silver','junior'),('barrick-mining','Barrick Mining','major'),('teck','Teck','major'),('rio-tinto','Rio Tinto','major'),('first-quantum','First Quantum','major'),('minsur','Minsur','major'),('anglo-american','Anglo American','major'),('bhp','BHP','major'),('newmont','Newmont','major');

INSERT OR IGNORE INTO hub_projects(slug,name,company_id,country,region,commodities,stage)
SELECT 'cangallo','Cangallo',id,'Peru','Arequipa','["Cu","Au"]','exploration' FROM hub_companies WHERE slug='ausquest';
INSERT OR IGNORE INTO hub_projects(slug,name,company_id,country,region,commodities,stage)
SELECT 'curibaya','Curibaya',id,'Peru','Tacna','["Ag","Au","Cu"]','exploration' FROM hub_companies WHERE slug='tier-one-silver';
INSERT OR IGNORE INTO hub_projects(slug,name,company_id,country,region,commodities,stage)
SELECT 'pico-machay','Pico Machay',id,'Peru','Huancavelica','["Au"]','advanced' FROM hub_companies WHERE slug='xali-gold';
INSERT OR IGNORE INTO hub_projects(slug,name,company_id,country,region,commodities,stage)
SELECT 'pucamayo','Pucamayo',id,'Peru','Central Peru','["Au","Ag","Cu"]','exploration' FROM hub_companies WHERE slug='condor-resources';
INSERT OR IGNORE INTO hub_projects(slug,name,company_id,country,region,commodities,stage)
SELECT 'jonco','Jonco',id,'Peru','Central Peru','["Ag","Au","Pb","Zn"]','exploration' FROM hub_companies WHERE slug='radius-gold';
INSERT OR IGNORE INTO hub_projects(slug,name,company_id,country,region,commodities,stage)
SELECT 'ninobamba','Niñobamba',id,'Peru','Ayacucho','["Ag","Au"]','exploration' FROM hub_companies WHERE slug='magma-silver';
INSERT OR IGNORE INTO hub_projects(slug,name,company_id,country,region,commodities,stage)
SELECT 'pecoy','Pecoy',id,'Peru','Arequipa','["Cu","Au","Ag","Mo"]','resource' FROM hub_companies WHERE slug='pecoy-copper';
INSERT OR IGNORE INTO hub_projects(slug,name,company_id,country,region,commodities,stage)
SELECT 'cotabambas','Cotabambas',id,'Peru','Apurimac','["Cu","Au","Ag"]','advanced' FROM hub_companies WHERE slug='panoro-minerals';
INSERT OR IGNORE INTO hub_projects(slug,name,company_id,country,region,commodities,stage)
SELECT 'usicayos','Usicayos',id,'Peru','Puno','["Au"]','exploration' FROM hub_companies WHERE slug='palamina';
INSERT OR IGNORE INTO hub_projects(slug,name,company_id,country,region,commodities,stage)
SELECT 'berenguela','Berenguela',id,'Peru','Puno','["Ag","Cu","Mn"]','advanced' FROM hub_companies WHERE slug='aftermath-silver';
INSERT OR IGNORE INTO hub_projects(slug,name,company_id,country,region,commodities,stage)
SELECT 'nueva-recuperada','Nueva Recuperada',id,'Peru','Huancavelica','["Ag","Au","Pb","Zn"]','resource' FROM hub_companies WHERE slug='silver-x-mining';
