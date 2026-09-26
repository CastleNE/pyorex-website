-- PyOrex source-store spatial indexes
CREATE INDEX IF NOT EXISTS idx_source_records_lat_lon ON source_records(latitude,longitude);
CREATE INDEX IF NOT EXISTS idx_source_records_source_layer_geo ON source_records(source,source_layer,latitude,longitude);
