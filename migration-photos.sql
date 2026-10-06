ALTER TABLE proprietaires ADD COLUMN IF NOT EXISTS photo_originale text;
ALTER TABLE chauffeurs    ADD COLUMN IF NOT EXISTS photo_originale text;
ALTER TABLE elements      ADD COLUMN IF NOT EXISTS photo_originale text;
