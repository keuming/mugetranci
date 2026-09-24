-- ============================================================
-- COMIX-CI — Intégration ORZAYAH (compte marchand + QR du verso)
-- À exécuter dans Neon (SQL Editor) AVANT de pousser le code.
-- Idempotent : peut être rejoué sans risque.
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['proprietaires', 'chauffeurs', 'elements'] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS orzayah_compte varchar(30)', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS orzayah_statut varchar(12)', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS orzayah_erreur text', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS orzayah_merchant_id varchar(64)', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS orzayah_qr_url text', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS orzayah_qr_image text', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS orzayah_lie_at timestamp', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (orzayah_compte)', t || '_orzayah_compte_idx', t);
  END LOOP;
END $$;

-- Contrôle
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE column_name LIKE 'orzayah_%' AND table_name IN ('proprietaires', 'chauffeurs', 'elements')
ORDER BY table_name, column_name;
