-- COMIX-CI — Rapport des doublons DÉJÀ présents en base (lecture seule)
-- Même normalisation que lib/doublons.js : majuscules, sans espace/point/tiret/slash ;
-- téléphone : chiffres seuls, sans indicatif 225.
WITH membres AS (
  SELECT 'transporteur' AS categorie, id, prenoms || ' ' || nom AS membre, carte_transporteur_numero AS carte,
         cni, numero_permis AS permis, contact1, orzayah_compte, orzayah_telephone FROM proprietaires
  UNION ALL
  SELECT 'chauffeur', id, prenoms || ' ' || nom, numero_carte, cni, permis_numero, contact1, orzayah_compte, orzayah_telephone FROM chauffeurs
  UNION ALL
  SELECT 'element', id, prenoms || ' ' || nom, numero_carte, cni, NULL, contact1, orzayah_compte, orzayah_telephone FROM elements
),
norm AS (
  SELECT categorie, membre, carte,
    nullif(upper(regexp_replace(coalesce(cni, ''), '[\s./-]+', '', 'g')), '') AS n_cni,
    nullif(upper(regexp_replace(coalesce(permis, ''), '[\s./-]+', '', 'g')), '') AS n_permis,
    nullif(regexp_replace(regexp_replace(coalesce(contact1, ''), '\D', '', 'g'), '^(00225|225(?=\d{10}$))', ''), '') AS n_tel,
    nullif(upper(regexp_replace(coalesce(orzayah_compte, ''), '[\s./-]+', '', 'g')), '') AS n_orz,
    nullif(regexp_replace(regexp_replace(coalesce(orzayah_telephone, ''), '\D', '', 'g'), '^(00225|225(?=\d{10}$))', ''), '') AS n_orz_tel
  FROM membres
)
SELECT 'CNI' AS critere, categorie, n_cni AS valeur, string_agg(membre || ' [' || coalesce(carte, '—') || ']', ' | ') AS membres
  FROM norm WHERE n_cni IS NOT NULL GROUP BY categorie, n_cni HAVING count(*) > 1
UNION ALL
SELECT 'Permis', categorie, n_permis, string_agg(membre || ' [' || coalesce(carte, '—') || ']', ' | ')
  FROM norm WHERE n_permis IS NOT NULL GROUP BY categorie, n_permis HAVING count(*) > 1
UNION ALL
SELECT 'Téléphone', categorie, n_tel, string_agg(membre || ' [' || coalesce(carte, '—') || ']', ' | ')
  FROM norm WHERE n_tel IS NOT NULL GROUP BY categorie, n_tel HAVING count(*) > 1
UNION ALL
SELECT 'QR ORZAYAH', 'toutes', n_orz, string_agg(categorie || ' ' || membre || ' [' || coalesce(carte, '—') || ']', ' | ')
  FROM norm WHERE n_orz IS NOT NULL GROUP BY n_orz HAVING count(*) > 1
UNION ALL
SELECT 'Tél. ORZAYAH', 'toutes', n_orz_tel, string_agg(categorie || ' ' || membre || ' [' || coalesce(carte, '—') || ']', ' | ')
  FROM norm WHERE n_orz_tel IS NOT NULL GROUP BY n_orz_tel HAVING count(*) > 1
ORDER BY 1, 2;
