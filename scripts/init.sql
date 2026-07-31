-- Enable extensions needed for full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Grant all to user (Postgres 16 superuser already has access, but explicit for clarity)
GRANT ALL PRIVILEGES ON DATABASE rikkei_docs TO rikkei;
