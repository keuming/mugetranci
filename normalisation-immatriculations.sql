-- COMIX-CI — Normalisation des immatriculations (majuscules, sans espace, tiret ni point)
-- 1) APERÇU (ne modifie rien)
SELECT immatriculation AS actuelle,
       upper(regexp_replace(immatriculation, '[\s.-]+', '', 'g')) AS normalisee,
       (SELECT count(*) FROM vehicules v2
         WHERE upper(regexp_replace(v2.immatriculation, '[\s.-]+', '', 'g'))
             = upper(regexp_replace(v.immatriculation, '[\s.-]+', '', 'g'))) > 1 AS conflit
FROM vehicules v
WHERE immatriculation <> upper(regexp_replace(immatriculation, '[\s.-]+', '', 'g'))
ORDER BY 1;

-- 2) NORMALISATION (à lancer seulement si aucune ligne n'a conflit = true)
UPDATE vehicules
SET immatriculation = upper(regexp_replace(immatriculation, '[\s.-]+', '', 'g'))
WHERE immatriculation <> upper(regexp_replace(immatriculation, '[\s.-]+', '', 'g'));

-- 3) CONTRÔLE (attendu : 0)
SELECT count(*) AS restantes FROM vehicules
WHERE immatriculation <> upper(regexp_replace(immatriculation, '[\s.-]+', '', 'g'));
