-- ============================================================
-- CONTROLE DE SANTE — COMIX-CI
--
-- Une seule requete, a lancer de temps en temps dans Neon.
-- Elle NE MODIFIE RIEN : elle liste ce qui cloche et indique
-- quoi faire pour chaque anomalie.
--
-- Tout va bien si la colonne "nombre" ne contient que des 0.
-- ============================================================

SELECT * FROM (

  -- ---------- MEMBRES ----------
  SELECT 1 AS ordre, 'Transporteurs sans association' AS controle,
         count(*) AS nombre,
         'Lancer rattrapage-associations.sql' AS action
  FROM proprietaires WHERE association_id IS NULL

  UNION ALL
  SELECT 2, 'Chauffeurs sans association', count(*),
         'Lancer rattrapage-associations.sql'
  FROM chauffeurs WHERE association_id IS NULL

  UNION ALL
  SELECT 3, 'Elements sans association', count(*),
         'Lancer rattrapage-associations.sql'
  FROM elements WHERE association_id IS NULL

  UNION ALL
  SELECT 4, 'Membres sans collectif', count(*),
         'Ouvrir la fiche et choisir le collectif'
  FROM (SELECT id FROM proprietaires WHERE syndicat_id IS NULL
        UNION ALL SELECT id FROM chauffeurs WHERE syndicat_id IS NULL
        UNION ALL SELECT id FROM elements WHERE syndicat_id IS NULL) x

  UNION ALL
  SELECT 5, 'Membres sans commune', count(*),
         'Ouvrir la fiche et choisir la commune'
  FROM (SELECT id FROM proprietaires WHERE commune IS NULL
        UNION ALL SELECT id FROM chauffeurs WHERE commune IS NULL
        UNION ALL SELECT id FROM elements WHERE commune IS NULL) x

  -- ---------- VEHICULES ----------
  UNION ALL
  SELECT 6, 'Vehicules sans collectif (invisibles)', count(*),
         'Lancer reparation-vehicules.sql'
  FROM vehicules WHERE syndicat_id IS NULL

  UNION ALL
  SELECT 7, 'Vehicules sans transporteur', count(*),
         'Normal si le dossier est en cours - a completer'
  FROM vehicules WHERE proprietaire_id IS NULL

  UNION ALL
  SELECT 8, 'Vehicules sans carte grise ou immatriculation', count(*),
         'Anomalie : ces champs sont obligatoires'
  FROM vehicules WHERE carte_grise IS NULL OR immatriculation IS NULL

  -- ---------- STRUCTURE ----------
  UNION ALL
  SELECT 9, 'Communes ayant plus de deux collectifs', count(*),
         'Lancer migration-collectifs.sql pour les requalifier'
  FROM (SELECT commune FROM syndicats WHERE commune IS NOT NULL
        GROUP BY commune HAVING count(*) > 2) x

  UNION ALL
  SELECT 10, 'Collectifs sans commune ou sans type', count(*),
         'Les completer : sinon absents des menus deroulants'
  FROM syndicats WHERE commune IS NULL OR type IS NULL

  UNION ALL
  SELECT 11, 'Commissions mixtes sans commune', count(*),
         'Les completer : sinon non deduites a la saisie'
  FROM commissions_mixtes WHERE commune IS NULL

  UNION ALL
  SELECT 12, 'Associations rattachees a un collectif inexistant', count(*),
         'Anomalie grave : me la signaler'
  FROM associations a
  WHERE NOT EXISTS (SELECT 1 FROM syndicats s WHERE s.id = a.syndicat_id)

  -- ---------- DOUBLONS ----------
  UNION ALL
  SELECT 13, 'Immatriculations en double', count(*),
         'Corriger : deux vehicules ne peuvent partager une plaque'
  FROM (SELECT immatriculation FROM vehicules WHERE immatriculation IS NOT NULL
        GROUP BY immatriculation HAVING count(*) > 1) x

  UNION ALL
  SELECT 14, 'Numeros de carte transporteur en double', count(*),
         'Corriger : chaque carte doit avoir un numero unique'
  FROM (SELECT carte_transporteur_numero FROM proprietaires
        WHERE carte_transporteur_numero IS NOT NULL
        GROUP BY carte_transporteur_numero HAVING count(*) > 1) x

  UNION ALL
  SELECT 15, 'Numeros de carte chauffeur en double', count(*),
         'Corriger : chaque carte doit avoir un numero unique'
  FROM (SELECT numero_carte FROM chauffeurs WHERE numero_carte IS NOT NULL
        GROUP BY numero_carte HAVING count(*) > 1) x

  UNION ALL
  SELECT 16, 'Identifiants de connexion en double', count(*),
         'Corriger : un identifiant ne peut servir a deux comptes'
  FROM (SELECT login FROM (
          SELECT login FROM commissions_mixtes WHERE login IS NOT NULL
          UNION ALL SELECT login FROM syndicats WHERE login IS NOT NULL
          UNION ALL SELECT login FROM associations WHERE login IS NOT NULL
          UNION ALL SELECT login FROM gares_routieres WHERE login IS NOT NULL
          UNION ALL SELECT login FROM agents WHERE login IS NOT NULL) t
        GROUP BY login HAVING count(*) > 1) x

) bilan
ORDER BY ordre;
