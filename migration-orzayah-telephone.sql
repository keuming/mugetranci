-- COMIX-CI — Numéro de téléphone ORZAYAH (à exécuter dans Neon AVANT de pousser le code)
ALTER TABLE proprietaires ADD COLUMN IF NOT EXISTS orzayah_telephone varchar(30);
ALTER TABLE chauffeurs    ADD COLUMN IF NOT EXISTS orzayah_telephone varchar(30);
ALTER TABLE elements      ADD COLUMN IF NOT EXISTS orzayah_telephone varchar(30);
