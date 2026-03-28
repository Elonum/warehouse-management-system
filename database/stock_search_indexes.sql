-- Apply on existing databases when schema.sql was created before trigram indexes.
-- Requires PostgreSQL pg_trgm (CREATE EXTENSION IF NOT EXISTS pg_trgm;).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_products_article_trgm ON products USING gin (article gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_barcode_trgm ON products USING gin (barcode gin_trgm_ops);

ANALYZE products;
