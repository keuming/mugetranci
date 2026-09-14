-- ============================================================
-- REPARATION — Vehicules devenus invisibles
--
-- Un vehicule cree par une commission mixte, un agent de commission
-- ou l'administrateur ne recevait aucun collectif : il disparaissait
-- alors de toutes les listes, y compris "Vehicule a rattacher".
-- ============================================================

-- ETAPE 1 — Combien sont concernes ?
SELECT count(*) FILTER (WHERE syndicat_id IS NULL) AS sans_collectif,
       count(*) FILTER (WHERE syndicat_id IS NULL AND proprietaire_id IS NOT NULL) AS recuperables,
       count(*) AS total
FROM vehicules;

-- ETAPE 2 — Faire heriter le rattachement du transporteur du dossier
UPDATE vehicules v SET
  syndicat_id    = COALESCE(v.syndicat_id,    (SELECT p.syndicat_id    FROM proprietaires p WHERE p.id = v.proprietaire_id)),
  association_id = COALESCE(v.association_id, (SELECT p.association_id FROM proprietaires p WHERE p.id = v.proprietaire_id)),
  commune        = COALESCE(v.commune,        (SELECT p.commune        FROM proprietaires p WHERE p.id = v.proprietaire_id)),
  commission_mixte_id = COALESCE(v.commission_mixte_id, (SELECT p.commission_mixte_id FROM proprietaires p WHERE p.id = v.proprietaire_id))
WHERE v.proprietaire_id IS NOT NULL
  AND (v.syndicat_id IS NULL OR v.association_id IS NULL OR v.commune IS NULL);

-- ETAPE 3 — Vehicules sans transporteur : les rattacher via leur gare
-- d'affectation, seule piste fiable disponible.
UPDATE vehicules v SET syndicat_id = (
  SELECT g.syndicat_id FROM affectations a
  JOIN gares_routieres g ON g.id = a.gare_routiere_id
  WHERE a.vehicule_id = v.id AND a.actif = true LIMIT 1
)
WHERE v.syndicat_id IS NULL
  AND EXISTS (SELECT 1 FROM affectations a WHERE a.vehicule_id = v.id AND a.actif = true AND a.gare_routiere_id IS NOT NULL);

-- ETAPE 4 — Que reste-t-il ? Ces vehicules n'ont ni transporteur ni gare :
-- ils restent visibles pour leur commission mixte et l'administrateur.
SELECT v.immatriculation, v.carte_grise, v.commune, v.commission_mixte_id
FROM vehicules v WHERE v.syndicat_id IS NULL;
