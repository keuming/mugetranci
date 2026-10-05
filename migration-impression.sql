DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['proprietaires', 'chauffeurs', 'elements', 'vehicules'] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS pret_impression boolean NOT NULL DEFAULT false', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS pret_impression_at timestamp', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS pret_impression_par varchar(160)', t);
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS lot_impression varchar(6)', t);
    -- Cartes déjà imprimées : lot déduit de leur date d'impression
    EXECUTE format('UPDATE %I SET lot_impression = to_char(carte_imprimee_at, ''MMYYYY'') WHERE carte_imprimee AND carte_imprimee_at IS NOT NULL AND lot_impression IS NULL', t);
  END LOOP;
END $$;

CREATE TABLE IF NOT EXISTS acces_impression (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periode varchar(6) NOT NULL UNIQUE,
  pin_code varchar(40) NOT NULL,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now()
);
