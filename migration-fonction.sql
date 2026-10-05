-- COMIX-CI : fonction / qualification des transporteurs et chauffeurs (à exécuter dans Neon AVANT de pousser le code)
ALTER TABLE proprietaires ADD COLUMN IF NOT EXISTS fonction varchar(120);
ALTER TABLE chauffeurs    ADD COLUMN IF NOT EXISTS fonction varchar(120);
