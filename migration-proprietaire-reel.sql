ALTER TABLE vehicules ADD COLUMN IF NOT EXISTS proprietaire_reel_nom varchar(160);
ALTER TABLE vehicules ADD COLUMN IF NOT EXISTS proprietaire_reel_contact varchar(30);
ALTER TABLE vehicules ADD COLUMN IF NOT EXISTS anciens_detenteurs jsonb DEFAULT '[]'::jsonb;
