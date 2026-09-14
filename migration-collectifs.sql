-- ============================================================
-- MIGRATION — Remettre MUGETRAN-CI et MUGETRANCI-SGEA au bon niveau
--
-- Ces deux entites sont enregistrees comme COLLECTIFS alors que ce
-- sont des ASSOCIATIONS. Dans chaque commune il ne doit exister que
-- deux collectifs : celui des transporteurs et celui des conducteurs.
-- Pour Yopougon : CSTY et COSYNCY.
--
-- A executer dans l'editeur SQL de Neon, ETAPE PAR ETAPE.
-- Ne passez a l'etape suivante qu'apres avoir verifie la precedente.
-- ============================================================


-- ------------------------------------------------------------
-- ETAPE 1 — ETAT DES LIEUX (aucune modification)
-- Verifiez que les 4 entites existent et notez leurs effectifs.
-- ------------------------------------------------------------
SELECT
  s.sigle,
  s.nom,
  s.commune,
  s.type,
  (SELECT count(*) FROM proprietaires p WHERE p.syndicat_id = s.id) AS transporteurs,
  (SELECT count(*) FROM chauffeurs   c WHERE c.syndicat_id = s.id) AS chauffeurs,
  (SELECT count(*) FROM elements     e WHERE e.syndicat_id = s.id) AS elements,
  (SELECT count(*) FROM vehicules    v WHERE v.syndicat_id = s.id) AS vehicules,
  (SELECT count(*) FROM gares_routieres g WHERE g.syndicat_id = s.id) AS gares,
  (SELECT count(*) FROM associations  a WHERE a.syndicat_id = s.id) AS associations
FROM syndicats s
WHERE s.sigle IN ('CSTY', 'COSYNCY', 'MUGETRAN-CI', 'MUGETRANCI-SGEA')
ORDER BY s.sigle;

-- Attendu : CSTY et COSYNCY presents (les vrais collectifs), plus les
-- deux entites a deplacer. Si un sigle differe, adaptez-le partout
-- ci-dessous avant de continuer.


-- ------------------------------------------------------------
-- ETAPE 2 — CREER LES DEUX ASSOCIATIONS
-- MUGETRAN-CI (transporteurs) passe sous CSTY
-- MUGETRANCI-SGEA (chauffeurs) passe sous COSYNCY
-- Les logos, presidents et comptes de connexion sont conserves.
-- ------------------------------------------------------------
INSERT INTO associations (syndicat_id, nom, sigle, logo_url, president_nom, president_contact, login, pin_code)
SELECT
  (SELECT id FROM syndicats WHERE sigle = 'CSTY'),
  s.nom, s.sigle, s.logo_url, s.president_nom, s.president_contact, s.login, s.pin_code
FROM syndicats s
WHERE s.sigle = 'MUGETRAN-CI'
  AND NOT EXISTS (SELECT 1 FROM associations a WHERE a.sigle = 'MUGETRAN-CI');

INSERT INTO associations (syndicat_id, nom, sigle, logo_url, president_nom, president_contact, login, pin_code)
SELECT
  (SELECT id FROM syndicats WHERE sigle = 'COSYNCY'),
  s.nom, s.sigle, s.logo_url, s.president_nom, s.president_contact, s.login, s.pin_code
FROM syndicats s
WHERE s.sigle = 'MUGETRANCI-SGEA'
  AND NOT EXISTS (SELECT 1 FROM associations a WHERE a.sigle = 'MUGETRANCI-SGEA');

-- Controle
SELECT a.sigle, a.nom, s.sigle AS collectif_parent
FROM associations a JOIN syndicats s ON s.id = a.syndicat_id
ORDER BY a.sigle;


-- ------------------------------------------------------------
-- ETAPE 3 — REPORTER LES MEMBRES
-- Chaque membre passe sous le vrai collectif, et garde son
-- appartenance via la nouvelle association.
-- ------------------------------------------------------------

-- 3a. MUGETRAN-CI -> CSTY
UPDATE proprietaires SET
  syndicat_id    = (SELECT id FROM syndicats    WHERE sigle = 'CSTY'),
  association_id = (SELECT id FROM associations WHERE sigle = 'MUGETRAN-CI')
WHERE syndicat_id = (SELECT id FROM syndicats WHERE sigle = 'MUGETRAN-CI');

UPDATE chauffeurs SET
  syndicat_id    = (SELECT id FROM syndicats    WHERE sigle = 'CSTY'),
  association_id = (SELECT id FROM associations WHERE sigle = 'MUGETRAN-CI')
WHERE syndicat_id = (SELECT id FROM syndicats WHERE sigle = 'MUGETRAN-CI');

UPDATE elements SET
  syndicat_id    = (SELECT id FROM syndicats    WHERE sigle = 'CSTY'),
  association_id = (SELECT id FROM associations WHERE sigle = 'MUGETRAN-CI')
WHERE syndicat_id = (SELECT id FROM syndicats WHERE sigle = 'MUGETRAN-CI');

UPDATE vehicules SET
  syndicat_id    = (SELECT id FROM syndicats    WHERE sigle = 'CSTY'),
  association_id = (SELECT id FROM associations WHERE sigle = 'MUGETRAN-CI')
WHERE syndicat_id = (SELECT id FROM syndicats WHERE sigle = 'MUGETRAN-CI');

UPDATE gares_routieres SET
  syndicat_id = (SELECT id FROM syndicats WHERE sigle = 'CSTY')
WHERE syndicat_id = (SELECT id FROM syndicats WHERE sigle = 'MUGETRAN-CI');

-- 3b. MUGETRANCI-SGEA -> COSYNCY
UPDATE proprietaires SET
  syndicat_id    = (SELECT id FROM syndicats    WHERE sigle = 'COSYNCY'),
  association_id = (SELECT id FROM associations WHERE sigle = 'MUGETRANCI-SGEA')
WHERE syndicat_id = (SELECT id FROM syndicats WHERE sigle = 'MUGETRANCI-SGEA');

UPDATE chauffeurs SET
  syndicat_id    = (SELECT id FROM syndicats    WHERE sigle = 'COSYNCY'),
  association_id = (SELECT id FROM associations WHERE sigle = 'MUGETRANCI-SGEA')
WHERE syndicat_id = (SELECT id FROM syndicats WHERE sigle = 'MUGETRANCI-SGEA');

UPDATE elements SET
  syndicat_id    = (SELECT id FROM syndicats    WHERE sigle = 'COSYNCY'),
  association_id = (SELECT id FROM associations WHERE sigle = 'MUGETRANCI-SGEA')
WHERE syndicat_id = (SELECT id FROM syndicats WHERE sigle = 'MUGETRANCI-SGEA');

UPDATE vehicules SET
  syndicat_id    = (SELECT id FROM syndicats    WHERE sigle = 'COSYNCY'),
  association_id = (SELECT id FROM associations WHERE sigle = 'MUGETRANCI-SGEA')
WHERE syndicat_id = (SELECT id FROM syndicats WHERE sigle = 'MUGETRANCI-SGEA');

UPDATE gares_routieres SET
  syndicat_id = (SELECT id FROM syndicats WHERE sigle = 'COSYNCY')
WHERE syndicat_id = (SELECT id FROM syndicats WHERE sigle = 'MUGETRANCI-SGEA');


-- ------------------------------------------------------------
-- ETAPE 4 — REPORTER LE LOGO DE DROITE DES CARTES
-- Les membres dont le logo de droite pointait vers l'ancien
-- "collectif" doivent pointer vers la nouvelle association.
-- ------------------------------------------------------------
UPDATE proprietaires SET logo1_type = 'association',
  logo1_id = (SELECT id FROM associations WHERE sigle = 'MUGETRAN-CI')
WHERE logo1_id = (SELECT id FROM syndicats WHERE sigle = 'MUGETRAN-CI');

UPDATE chauffeurs SET logo1_type = 'association',
  logo1_id = (SELECT id FROM associations WHERE sigle = 'MUGETRANCI-SGEA')
WHERE logo1_id = (SELECT id FROM syndicats WHERE sigle = 'MUGETRANCI-SGEA');

-- Le logo de gauche doit pointer vers le vrai collectif
UPDATE proprietaires SET logo2_type = 'syndicat',
  logo2_id = (SELECT id FROM syndicats WHERE sigle = 'CSTY')
WHERE logo2_id = (SELECT id FROM syndicats WHERE sigle = 'MUGETRAN-CI');

UPDATE chauffeurs SET logo2_type = 'syndicat',
  logo2_id = (SELECT id FROM syndicats WHERE sigle = 'COSYNCY')
WHERE logo2_id = (SELECT id FROM syndicats WHERE sigle = 'MUGETRANCI-SGEA');


-- ------------------------------------------------------------
-- ETAPE 5 — CONTROLE AVANT SUPPRESSION
-- Les deux lignes doivent afficher 0 PARTOUT. Sinon, ne supprimez
-- pas : il reste des rattachements a traiter.
-- ------------------------------------------------------------
SELECT
  s.sigle,
  (SELECT count(*) FROM proprietaires p WHERE p.syndicat_id = s.id) AS transporteurs,
  (SELECT count(*) FROM chauffeurs   c WHERE c.syndicat_id = s.id) AS chauffeurs,
  (SELECT count(*) FROM elements     e WHERE e.syndicat_id = s.id) AS elements,
  (SELECT count(*) FROM vehicules    v WHERE v.syndicat_id = s.id) AS vehicules,
  (SELECT count(*) FROM gares_routieres g WHERE g.syndicat_id = s.id) AS gares,
  (SELECT count(*) FROM associations  a WHERE a.syndicat_id = s.id) AS associations
FROM syndicats s
WHERE s.sigle IN ('MUGETRAN-CI', 'MUGETRANCI-SGEA');


-- ------------------------------------------------------------
-- ETAPE 6 — SUPPRIMER LES DEUX FAUX COLLECTIFS
-- A n'executer QUE si l'etape 5 affiche des zeros partout.
-- ------------------------------------------------------------
DELETE FROM syndicats WHERE sigle IN ('MUGETRAN-CI', 'MUGETRANCI-SGEA');


-- ------------------------------------------------------------
-- ETAPE 7 — VERIFICATION FINALE
-- Yopougon ne doit plus compter que deux collectifs.
-- ------------------------------------------------------------
SELECT sigle, nom, type FROM syndicats WHERE commune = 'YOPOUGON' ORDER BY type;

SELECT a.sigle, a.nom, s.sigle AS collectif_parent
FROM associations a JOIN syndicats s ON s.id = a.syndicat_id
ORDER BY s.sigle, a.sigle;
