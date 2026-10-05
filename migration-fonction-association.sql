ALTER TABLE proprietaires ADD COLUMN IF NOT EXISTS fonction_association varchar(120);
ALTER TABLE chauffeurs    ADD COLUMN IF NOT EXISTS fonction_association varchar(120);
ALTER TABLE elements      ADD COLUMN IF NOT EXISTS fonction_association varchar(120);
