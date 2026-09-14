-- ============================================================
-- RATTRAPAGE — Rattacher les membres enroles avant la mise a jour
--
-- Ces membres n'ont pas d'association_id : ils restent visibles pour
-- leur collectif mais pas dans le tableau de bord d'une association.
--
-- La plupart sont recuperables automatiquement : si le logo de droite
-- de leur carte pointe deja vers une association, c'est celle-la.
--
-- A executer dans l'editeur SQL de Neon, ETAPE PAR ETAPE.
-- ============================================================


-- ------------------------------------------------------------
-- ETAPE 1 — COMBIEN DE MEMBRES SONT CONCERNES ?
-- ------------------------------------------------------------
SELECT 'transporteurs' AS categorie,
       count(*) FILTER (WHERE association_id IS NULL) AS sans_association,
       count(*) FILTER (WHERE association_id IS NULL AND logo1_type = 'association') AS recuperables,
       count(*) AS total
FROM proprietaires
UNION ALL
SELECT 'chauffeurs',
       count(*) FILTER (WHERE association_id IS NULL),
       count(*) FILTER (WHERE association_id IS NULL AND logo1_type = 'association'),
       count(*)
FROM chauffeurs
UNION ALL
SELECT 'elements',
       count(*) FILTER (WHERE association_id IS NULL),
       count(*) FILTER (WHERE association_id IS NULL AND logo1_type = 'association'),
       count(*)
FROM elements
UNION ALL
SELECT 'vehicules',
       count(*) FILTER (WHERE association_id IS NULL),
       count(*) FILTER (WHERE association_id IS NULL AND logo1_type IS NOT NULL),
       count(*)
FROM vehicules;

-- "recuperables" = rattachables automatiquement par l'etape 2.
-- La difference avec "sans_association" devra etre traitee a l'etape 3.


-- ------------------------------------------------------------
-- ETAPE 2 — RATTACHEMENT AUTOMATIQUE
-- Quand le logo de droite pointe deja vers une association existante,
-- on en deduit le rattachement.
-- ------------------------------------------------------------
UPDATE proprietaires p SET association_id = p.logo1_id
WHERE p.association_id IS NULL
  AND p.logo1_type = 'association'
  AND EXISTS (SELECT 1 FROM associations a WHERE a.id = p.logo1_id);

UPDATE chauffeurs c SET association_id = c.logo1_id
WHERE c.association_id IS NULL
  AND c.logo1_type = 'association'
  AND EXISTS (SELECT 1 FROM associations a WHERE a.id = c.logo1_id);

UPDATE elements e SET association_id = e.logo1_id
WHERE e.association_id IS NULL
  AND e.logo1_type = 'association'
  AND EXISTS (SELECT 1 FROM associations a WHERE a.id = e.logo1_id);


-- ------------------------------------------------------------
-- ETAPE 3 — RATTACHEMENT PAR DEDUCTION
-- Pour les membres restants : si leur collectif ne compte QU'UNE
-- SEULE association, il n'y a pas d'ambiguite, on la leur attribue.
-- ------------------------------------------------------------
UPDATE proprietaires p SET association_id = (
  SELECT a.id FROM associations a WHERE a.syndicat_id = p.syndicat_id
)
WHERE p.association_id IS NULL
  AND p.syndicat_id IS NOT NULL
  AND (SELECT count(*) FROM associations a WHERE a.syndicat_id = p.syndicat_id) = 1;

UPDATE chauffeurs c SET association_id = (
  SELECT a.id FROM associations a WHERE a.syndicat_id = c.syndicat_id
)
WHERE c.association_id IS NULL
  AND c.syndicat_id IS NOT NULL
  AND (SELECT count(*) FROM associations a WHERE a.syndicat_id = c.syndicat_id) = 1;

UPDATE elements e SET association_id = (
  SELECT a.id FROM associations a WHERE a.syndicat_id = e.syndicat_id
)
WHERE e.association_id IS NULL
  AND e.syndicat_id IS NOT NULL
  AND (SELECT count(*) FROM associations a WHERE a.syndicat_id = e.syndicat_id) = 1;

-- Le vehicule suit l'association de son transporteur
UPDATE vehicules v SET association_id = (
  SELECT p.association_id FROM proprietaires p WHERE p.id = v.proprietaire_id
)
WHERE v.association_id IS NULL
  AND v.proprietaire_id IS NOT NULL
  AND (SELECT p.association_id FROM proprietaires p WHERE p.id = v.proprietaire_id) IS NOT NULL;


-- ------------------------------------------------------------
-- ETAPE 4 — QUI RESTE A TRAITER A LA MAIN ?
-- Ces membres appartiennent a un collectif comptant plusieurs
-- associations : impossible de deviner laquelle sans se tromper.
-- Ouvrez-les en modification dans l'application pour choisir.
-- ------------------------------------------------------------
SELECT 'transporteur' AS categorie, p.nom, p.prenoms, s.sigle AS collectif,
       (SELECT count(*) FROM associations a WHERE a.syndicat_id = p.syndicat_id) AS choix_possibles
FROM proprietaires p LEFT JOIN syndicats s ON s.id = p.syndicat_id
WHERE p.association_id IS NULL
UNION ALL
SELECT 'chauffeur', c.nom, c.prenoms, s.sigle,
       (SELECT count(*) FROM associations a WHERE a.syndicat_id = c.syndicat_id)
FROM chauffeurs c LEFT JOIN syndicats s ON s.id = c.syndicat_id
WHERE c.association_id IS NULL
UNION ALL
SELECT 'element', e.nom, e.prenoms, s.sigle,
       (SELECT count(*) FROM associations a WHERE a.syndicat_id = e.syndicat_id)
FROM elements e LEFT JOIN syndicats s ON s.id = e.syndicat_id
WHERE e.association_id IS NULL
ORDER BY categorie, nom;

-- Si cette requete ne renvoie aucune ligne : tout est rattache.


-- ------------------------------------------------------------
-- ETAPE 5 — VERIFICATION : effectifs par association
-- ------------------------------------------------------------
SELECT s.sigle AS collectif, a.sigle AS association, a.nom,
       (SELECT count(*) FROM proprietaires p WHERE p.association_id = a.id) AS transporteurs,
       (SELECT count(*) FROM chauffeurs   c WHERE c.association_id = a.id) AS chauffeurs,
       (SELECT count(*) FROM elements     e WHERE e.association_id = a.id) AS elements,
       (SELECT count(*) FROM vehicules    v WHERE v.association_id = a.id) AS vehicules
FROM associations a JOIN syndicats s ON s.id = a.syndicat_id
ORDER BY s.sigle, a.sigle;
