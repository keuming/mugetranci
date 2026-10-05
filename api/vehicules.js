import { eq, desc, and } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  vehicules, historiqueProprietaires, vehiculeChauffeurs, affectations, achatsCarburant, syndicats, chauffeurs, proprietaires,
} from "../db/schema.js";
import { requireAuth, agentPeutGerer } from "../lib/auth.js";
import { normaliserImmatriculation, genererNumeroLigne } from "../lib/cards.js";
import { champsImpression, gererImprimeur, gererMarquageImpression } from "../lib/impression.js";

// Taux de commission de la mutuelle sur chaque achat de carburant.
const COMMISSION_RATE = 0.02; // 2%

function toApiCarburant(row, chauffeur, vehicule) {
  return {
    id: row.id,
    chauffeurId: row.chauffeurId,
    vehiculeId: row.vehiculeId,
    carteGrise: row.carteGrise,
    volumeLitres: Number(row.volumeLitres),
    montantFcfa: row.montantFcfa,
    commissionFcfa: row.commissionFcfa,
    station: row.station,
    createdAt: row.createdAt,
    chauffeurNom: chauffeur ? `${chauffeur.prenoms} ${chauffeur.nom}` : null,
    immatriculation: vehicule ? vehicule.immatriculation : null,
  };
}

// Fusionné depuis l'ancien /api/carburant.js pour rester sous la limite de
// 12 fonctions serverless du plan Vercel Hobby. Appelé via
// /api/vehicules?resource=carburant.
async function handleCarburant(req, res, auth) {
  if (req.method === "GET") {
    const [rows, allChauffeurs, allVehicules] = await Promise.all([
      db.select().from(achatsCarburant).orderBy(desc(achatsCarburant.createdAt)),
      db.select().from(chauffeurs),
      db.select().from(vehicules),
    ]);

    let visibleRows = rows;
    if (auth.role === "syndicat") {
      const myChauffeurIds = new Set(allChauffeurs.filter((c) => c.syndicatId === auth.syndicatId).map((c) => c.id));
      visibleRows = rows.filter((r) => myChauffeurIds.has(r.chauffeurId));
    } else if (auth.role === "commission_mixte") {
      const mySyndicats = await db.select().from(syndicats).where(eq(syndicats.commissionMixteId, auth.commissionMixteId));
      const mySyndicatIds = new Set(mySyndicats.map((s) => s.id));
      const myChauffeurIds = new Set(allChauffeurs.filter((c) => mySyndicatIds.has(c.syndicatId)).map((c) => c.id));
      visibleRows = rows.filter((r) => myChauffeurIds.has(r.chauffeurId));
    }

    const result = visibleRows.map((r) => toApiCarburant(
      r,
      allChauffeurs.find((c) => c.id === r.chauffeurId),
      allVehicules.find((v) => v.id === r.vehiculeId)
    ));
    return res.status(200).json(result);
  }

  if (req.method === "POST") {
    const body = req.body || {};
    if (!body.chauffeurId || !body.carteGrise || !body.volumeLitres || !body.montantFcfa) {
      return res.status(400).json({ error: "chauffeurId, carteGrise, volumeLitres et montantFcfa sont requis" });
    }

    const montant = Math.round(Number(body.montantFcfa));
    const commission = Math.round(montant * COMMISSION_RATE);

    const [created] = await db.insert(achatsCarburant).values({
      chauffeurId: body.chauffeurId,
      vehiculeId: body.vehiculeId || null,
      carteGrise: body.carteGrise,
      volumeLitres: String(body.volumeLitres),
      montantFcfa: montant,
      commissionFcfa: commission,
      station: body.station || null,
    }).returning();

    const [chauffeur] = await db.select().from(chauffeurs).where(eq(chauffeurs.id, created.chauffeurId));
    const vehicule = created.vehiculeId
      ? (await db.select().from(vehicules).where(eq(vehicules.id, created.vehiculeId)))[0]
      : null;

    return res.status(201).json(toApiCarburant(created, chauffeur, vehicule));
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Méthode non autorisée" });
}

function toApiFull(vehicule, chauffeurIds = [], historique = []) {
  const {
    photoUrl, visiteTechniqueDateFin, assuranceAutoDateFin, vignetteDateFin, carteStationnementDateFin,
    ...rest
  } = vehicule;
  return {
    ...rest,
    photo: photoUrl,
    documents: {
      visiteTechnique: visiteTechniqueDateFin,
      assuranceAuto: assuranceAutoDateFin,
      vignette: vignetteDateFin,
      carteStationnement: carteStationnementDateFin,
    },
    chauffeurIds,
    historiqueProprietaires: historique.map((h) => ({ proprietaireId: h.proprietaireId, depuis: h.depuis })),
  };
}
function toApiFlat(row) {
  const { photoUrl, ...rest } = row;
  return { ...rest, photo: photoUrl };
}
// Anciens détenteurs : liste propre de { nom, contact } (lignes vides retirées, 30 au plus).
function nettoyerDetenteurs(liste) {
  if (!Array.isArray(liste)) return [];
  return liste
    .map((r) => ({ nom: String(r?.nom || "").trim().slice(0, 160), contact: String(r?.contact || "").trim().slice(0, 30) }))
    .filter((r) => r.nom || r.contact)
    .slice(0, 30);
}
function toDbVehicule(body) {
  const { photo, documents = {}, chauffeurIds, historiqueProprietaires: _h, ...rest } = body;
  return {
    ...rest,
    immatriculation: normaliserImmatriculation(rest.immatriculation),
    marque: rest.marque || null,
    proprietaireReelNom: String(rest.proprietaireReelNom || "").trim() || null,
    proprietaireReelContact: String(rest.proprietaireReelContact || "").trim() || null,
    anciensDetenteurs: nettoyerDetenteurs(rest.anciensDetenteurs),
    modele: rest.modele || null,
    chassis: rest.chassis || null, // nullable + unique : jamais de chaîne vide, sinon conflit d'unicité entre dossiers sans châssis renseigné
    commissionMixteId: rest.commissionMixteId || null,
    commune: rest.commune || null,
    associationId: rest.associationId || null,
    nombrePlaces: rest.nombrePlaces ? Number(rest.nombrePlaces) : null,
    photoUrl: photo ?? null,
    photoCarteGrise: rest.photoCarteGrise ?? null,
    photoVisiteTechnique: rest.photoVisiteTechnique ?? null,
    photoAssuranceAuto: rest.photoAssuranceAuto ?? null,
    photoVignette: rest.photoVignette ?? null,
    photoCarteStationnement: rest.photoCarteStationnement ?? null,
    visiteTechniqueDateFin: documents.visiteTechnique || null,
    assuranceAutoDateFin: documents.assuranceAuto || null,
    vignetteDateFin: documents.vignette || null,
    carteStationnementDateFin: documents.carteStationnement || null,
  };
}

/* Fiche publique du vehicule : c'est le contenu du QR code imprime sur les
   cartes de membre. Volontairement SANS authentification -- un controle
   routier ou un agent au bord de la voie doit pouvoir l'ouvrir en scannant,
   sans identifiant ni PIN. En retour, seules des informations deja visibles
   sur les documents physiques (immatriculation, identite, validite des
   documents) sont exposees ; aucun code PIN, aucun identifiant de connexion. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Compte ORZAYAH exposé sur la fiche publique : seulement s'il est lié, et
// seulement ce qui sert à payer (code, QR, lien) — jamais le téléphone ORZAYAH.
function orzayahPublic(m) {
  if (!m || m.orzayahStatut !== "lie" || !m.orzayahQrImage) return null;
  const url = typeof m.orzayahQrUrl === "string" && m.orzayahQrUrl.startsWith("https://") ? m.orzayahQrUrl : null;
  return { compte: m.orzayahCompte, qrImage: m.orzayahQrImage, url };
}

async function handleFichePublique(req, res, vehiculeId) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  // Un identifiant mal forme (lien tronque, QR abime, adresse copiee a la
  // main) ne doit jamais provoquer une erreur serveur brute : Postgres
  // rejette un UUID invalide avant meme la requete, ce qui remontait en 500.
  if (!vehiculeId || !UUID_RE.test(vehiculeId)) {
    return res.status(400).json({ error: "Adresse de fiche invalide : ce lien ne correspond à aucun dossier." });
  }
  let v;
  try {
    [v] = await db.select().from(vehicules).where(eq(vehicules.id, vehiculeId));
  } catch (err) {
    console.error("GET fiche-publique:", err);
    return res.status(400).json({ error: "Adresse de fiche invalide." });
  }
  if (!v) return res.status(404).json({ error: "Dossier introuvable." });

  const [proprio] = v.proprietaireId
    ? await db.select().from(proprietaires).where(eq(proprietaires.id, v.proprietaireId))
    : [null];

  const liens = await db.select().from(vehiculeChauffeurs).where(eq(vehiculeChauffeurs.vehiculeId, vehiculeId));
  const chauffeurIds = liens.filter((l) => l.actif).map((l) => l.chauffeurId);
  // Une requete par id : la liste est courte, au plus 3 chauffeurs par dossier.
  const tousChauffeurs = [];
  for (const cid of chauffeurIds) {
    const [c] = await db.select().from(chauffeurs).where(eq(chauffeurs.id, cid));
    if (c) tousChauffeurs.push(c);
  }

  const [aff] = await db.select().from(affectations).where(eq(affectations.vehiculeId, vehiculeId));
  let gare = null, ligne = null;
  if (aff?.actif && aff.gareRoutiereId) {
    const { garesRoutieres, lignes } = await import("../db/schema.js");
    const [g] = await db.select().from(garesRoutieres).where(eq(garesRoutieres.id, aff.gareRoutiereId));
    gare = g || null;
    if (aff.ligneId) {
      const [l] = await db.select().from(lignes).where(eq(lignes.id, aff.ligneId));
      ligne = l || null;
    }
  }

  return res.status(200).json({
    vehicule: {
      immatriculation: v.immatriculation,
      carteGrise: v.carteGrise,
      marque: v.marque,
      modele: v.modele,
      categorie: v.categorie,
      nombrePlaces: v.nombrePlaces,
      energie: v.energie,
      couleur: v.couleur,
      typeTechnique: v.typeTechnique,
      puissanceFiscale: v.puissanceFiscale,
      numeroCarteLigne: v.numeroCarteLigne,
      chassis: v.chassis,
      photoUrl: v.photoUrl,
      documents: {
        visiteTechnique: v.visiteTechniqueDateFin,
        assuranceAuto: v.assuranceAutoDateFin,
        vignette: v.vignetteDateFin,
        carteStationnement: v.carteStationnementDateFin,
      },
    },
    transporteur: proprio ? {
      nom: proprio.nom, prenoms: proprio.prenoms,
      carteTransporteurNumero: proprio.carteTransporteurNumero,
      contact1: proprio.contact1, photoUrl: proprio.photoUrl,
      fonction: proprio.fonction || null, fonctionAssociation: proprio.fonctionAssociation || null,
      orzayah: orzayahPublic(proprio),
    } : null,
    chauffeurs: tousChauffeurs.map((c) => ({
      nom: c.nom, prenoms: c.prenoms, numeroCarte: c.numeroCarte,
      contact1: c.contact1, photoUrl: c.photoUrl, permisDateFin: c.permisDateFin,
      fonction: c.fonction || null, fonctionAssociation: c.fonctionAssociation || null,
      orzayah: orzayahPublic(c),
    })),
    pointFocal: gare ? {
      gare: gare.nom, commune: gare.commune,
      chefGareNom: gare.responsableNom, chefGareContact: gare.responsableContact,
      ligne: ligne ? `${ligne.lieuDepart} — ${ligne.lieuArrivee}` : null,
      chefLigneNom: ligne?.chefNom || null, chefLigneContact: ligne?.chefContact || null,
    } : null,
  });
}

export default async function handler(req, res) {
  const idParam = req.query.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  // Seule route publique de ce fichier : verifiee AVANT requireAuth.
  if (req.query.resource === "fiche-publique") {
    return handleFichePublique(req, res, id);
  }

  const auth = requireAuth(req, res);
  if (!auth) return;
  // Compte imprimeur : uniquement la confirmation d'impression des cartes envoyées.
  if (auth.role === "imprimeur") return gererImprimeur(req, res, auth, vehicules, toApiFlat);
  // Collectif / association / commission : marquage des cartes à imprimer de son périmètre.
  if (await gererMarquageImpression(req, res, auth, vehicules, toApiFlat)) return;

  // Photos des 5 documents d'un véhicule (exclues du démarrage pour la rapidité)
  if (req.query.resource === "photos" && req.method === "GET") {
    const authP = requireAuth(req, res);
    if (!authP) return;
    if (authP.role === "imprimeur") return res.status(403).json({ error: "Accès refusé." });
    const idP = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    const [v] = idP ? await db.select({
      photoCarteGrise: vehicules.photoCarteGrise, photoVisiteTechnique: vehicules.photoVisiteTechnique,
      photoAssuranceAuto: vehicules.photoAssuranceAuto, photoVignette: vehicules.photoVignette,
      photoCarteStationnement: vehicules.photoCarteStationnement,
    }).from(vehicules).where(eq(vehicules.id, idP)) : [];
    if (!v) return res.status(404).json({ error: "Véhicule introuvable." });
    return res.status(200).json(v);
  }

  if (req.query.resource === "carburant") {
    return handleCarburant(req, res, auth);
  }

  if (!id) {
    if (req.method === "GET") {
      const [rows, junctions, historiques, allAffectations] = await Promise.all([
        db.select().from(vehicules),
        db.select().from(vehiculeChauffeurs).where(eq(vehiculeChauffeurs.actif, true)),
        db.select().from(historiqueProprietaires),
        db.select().from(affectations).where(eq(affectations.actif, true)),
      ]);

      let visibleRows = rows;
      if (auth.role === "syndicat") {
        visibleRows = rows.filter((v) => v.syndicatId === auth.syndicatId);
      } else if (auth.role === "commission_mixte") {
        const mySyndicats = await db.select().from(syndicats).where(eq(syndicats.commissionMixteId, auth.commissionMixteId));
        const mySyndicatIds = new Set(mySyndicats.map((s) => s.id));
        const affectedIds = new Set(allAffectations.filter((a) => a.commissionMixteId === auth.commissionMixteId).map((a) => a.vehiculeId));
        visibleRows = rows.filter((v) => mySyndicatIds.has(v.syndicatId) || affectedIds.has(v.id));
      }

      const result = visibleRows.map((v) => {
        const chauffeurIds = junctions.filter((j) => j.vehiculeId === v.id).map((j) => j.chauffeurId);
        const historique = historiques.filter((h) => h.vehiculeId === v.id);
        return toApiFull(v, chauffeurIds, historique);
      });
      return res.status(200).json(result);
    }

    if (req.method === "POST") {
      if (auth.role === "commission_mixte") {
        return res.status(403).json({ error: "La commission mixte est en lecture seule — c'est au syndicat de gérer les véhicules." });
      }
      const body = req.body || {};
      // Un même chauffeur n'est rattaché qu'une fois à un véhicule.
      const chauffeurIds = [...new Set((body.chauffeurIds || []).filter(Boolean))];

      if (!body.carteGrise || !body.immatriculation) {
        return res.status(400).json({ error: "carteGrise et immatriculation sont requis pour créer le dossier" });
      }

      const dbValues = toDbVehicule(body);
      dbValues.numeroCarteLigne = await genererNumeroLigne(vehicules);
      if (auth.role === "syndicat") dbValues.syndicatId = auth.syndicatId;
      // L'agent peut enroler pour n'importe quel collectif : on n'impose le
      // sien qu'a defaut d'indication, sans jamais ecraser un choix explicite.
      if (auth.role === "agent" && auth.parentType === "syndicat" && !dbValues.syndicatId) {
        dbValues.syndicatId = auth.parentId;
      }
      // Un vehicule cree par une commission mixte, un agent de commission ou
      // l'administrateur n'avait aucun collectif : il devenait invisible pour
      // tout le monde, y compris son createur. On le fait donc heriter du
      // rattachement de son transporteur, qui est la reference du dossier.
      // L'association (et à défaut la commune, la commission) suit TOUJOURS le
      // transporteur, même quand le collectif gestionnaire est choisi dans le
      // formulaire : sinon le véhicule échappait à son association (invisible
      // pour elle, carte de ligne impossible à envoyer à l'imprimeur).
      if (body.proprietaireId) {
        const [prop] = await db.select().from(proprietaires).where(eq(proprietaires.id, body.proprietaireId));
        if (prop) {
          if (!dbValues.syndicatId) dbValues.syndicatId = prop.syndicatId || null;
          if (!dbValues.associationId) dbValues.associationId = prop.associationId || null;
          if (!dbValues.commune) dbValues.commune = prop.commune || null;
          if (!dbValues.commissionMixteId) dbValues.commissionMixteId = prop.commissionMixteId || null;
        }
      }

      let vehicule;
      try {
        [vehicule] = await db.insert(vehicules).values(dbValues).returning();
      } catch (err) {
        if (err.code === "23505") {
          return res.status(400).json({ error: "Ce numéro de carte grise, de châssis ou d'immatriculation est déjà utilisé par un autre véhicule." });
        }
        console.error("POST /api/vehicules:", err);
        return res.status(500).json({ error: "Erreur lors de la création du dossier." });
      }

      if (body.proprietaireId) {
        await db.insert(historiqueProprietaires).values({
          vehiculeId: vehicule.id,
          proprietaireId: body.proprietaireId,
          depuis: body.dateMiseCirculation || new Date().toISOString().slice(0, 10),
        });
      }

      for (const chauffeurId of chauffeurIds) {
        await db.insert(vehiculeChauffeurs).values({ vehiculeId: vehicule.id, chauffeurId });
      }

      const historique = body.proprietaireId
        ? [{ proprietaireId: body.proprietaireId, depuis: body.dateMiseCirculation || new Date().toISOString().slice(0, 10) }]
        : [];

      return res.status(201).json(toApiFull(vehicule, chauffeurIds, historique));
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  async function assertOwnership() {
    if (auth.role === "admin") return true;
    if (auth.role === "commission_mixte") {
      res.status(403).json({ error: "La commission mixte est en lecture seule." });
      return false;
    }
    const [v] = await db.select().from(vehicules).where(eq(vehicules.id, id));
    if (!v) { res.status(404).json({ error: "Véhicule introuvable" }); return false; }
    if (auth.role === "agent") {
      const ok = await agentPeutGerer(auth, v, async (cmId) => {
        const rows = await db.select().from(syndicats).where(eq(syndicats.commissionMixteId, cmId));
        return new Set(rows.map((s) => s.id));
      });
      if (ok) return true;
      res.status(403).json({ error: "Ce véhicule est hors de votre périmètre." });
      return false;
    }
    if (v.syndicatId !== auth.syndicatId) { res.status(403).json({ error: "Ce véhicule n'appartient pas à votre syndicat." }); return false; }
    return true;
  }

  if (req.method === "PATCH") {
    if (!(await assertOwnership())) return;

    const body = req.body || {};
    const documents = body.documents || {};
    const patch = {};
    if ("photo" in body) patch.photoUrl = body.photo;
    if ("marque" in body) patch.marque = body.marque;
    if ("modele" in body) patch.modele = body.modele;
    if ("chassis" in body) patch.chassis = body.chassis || null;
    if ("carteGrise" in body) patch.carteGrise = body.carteGrise;
    if ("nomCarteGrise" in body) patch.nomCarteGrise = body.nomCarteGrise;
    if ("proprietaireReelNom" in body) patch.proprietaireReelNom = String(body.proprietaireReelNom || "").trim() || null;
    if ("proprietaireReelContact" in body) patch.proprietaireReelContact = String(body.proprietaireReelContact || "").trim() || null;
    if ("anciensDetenteurs" in body) patch.anciensDetenteurs = nettoyerDetenteurs(body.anciensDetenteurs);
    if ("categorie" in body) patch.categorie = body.categorie;
    if ("immatriculation" in body) patch.immatriculation = normaliserImmatriculation(body.immatriculation);
    if ("dateMiseCirculation" in body) patch.dateMiseCirculation = body.dateMiseCirculation || null;
    if ("commune" in body) patch.commune = body.commune || null;
    if ("associationId" in body) patch.associationId = body.associationId || null;
    if ("commissionMixteId" in body) patch.commissionMixteId = body.commissionMixteId || null;
    if ("nombrePlaces" in body) patch.nombrePlaces = body.nombrePlaces ? Number(body.nombrePlaces) : null;
    if ("energie" in body) patch.energie = body.energie || null;
    if ("couleur" in body) patch.couleur = body.couleur || null;
    if ("typeTechnique" in body) patch.typeTechnique = body.typeTechnique || null;
    if ("puissanceFiscale" in body) patch.puissanceFiscale = body.puissanceFiscale || null;
    // Impression : date et lot fixés à la première impression ; envoi à l'imprimeur
    if ("carteImprimee" in body || "pretImpression" in body) {
      const [avantImpression] = await db.select().from(vehicules).where(eq(vehicules.id, id));
      Object.assign(patch, champsImpression(body, auth, avantImpression));
    }
    if ("photoCarteGrise" in body) patch.photoCarteGrise = body.photoCarteGrise || null;
    if ("photoVisiteTechnique" in body) patch.photoVisiteTechnique = body.photoVisiteTechnique || null;
    if ("photoAssuranceAuto" in body) patch.photoAssuranceAuto = body.photoAssuranceAuto || null;
    if ("photoVignette" in body) patch.photoVignette = body.photoVignette || null;
    if ("photoCarteStationnement" in body) patch.photoCarteStationnement = body.photoCarteStationnement || null;
    if ("proprietaireId" in body) patch.proprietaireId = body.proprietaireId || null;
    if ("visiteTechnique" in documents) patch.visiteTechniqueDateFin = documents.visiteTechnique || null;
    if ("assuranceAuto" in documents) patch.assuranceAutoDateFin = documents.assuranceAuto || null;
    if ("vignette" in documents) patch.vignetteDateFin = documents.vignette || null;
    if ("carteStationnement" in documents) patch.carteStationnementDateFin = documents.carteStationnement || null;

    if (Object.keys(patch).length === 0 && !body.addChauffeurId) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }

    try {
      let updated;
      if (Object.keys(patch).length > 0) {
        // Rattachement d'un nouveau transporteur : on trace le changement
        // dans l'historique, comme à la création du dossier.
        if ("proprietaireId" in patch && patch.proprietaireId) {
          const [prop] = await db.select().from(proprietaires).where(eq(proprietaires.id, patch.proprietaireId));
          if (prop) {
            if (!("syndicatId" in patch)) patch.syndicatId = prop.syndicatId || null;
            if (!("associationId" in patch)) patch.associationId = prop.associationId || null;
            if (!("commune" in patch)) patch.commune = prop.commune || null;
            if (!("commissionMixteId" in patch)) patch.commissionMixteId = prop.commissionMixteId || null;
          }
          await db.insert(historiqueProprietaires).values({
            vehiculeId: id,
            proprietaireId: patch.proprietaireId,
            depuis: new Date().toISOString().slice(0, 10),
          });
        }
        [updated] = await db.update(vehicules).set(patch).where(eq(vehicules.id, id)).returning();
        if (!updated) return res.status(404).json({ error: "Véhicule introuvable" });
      }

      // Rattachement d'un chauffeur supplémentaire au dossier.
      // Ignoré s'il est déjà rattaché (double clic, renvoi de la file hors ligne…).
      if (body.addChauffeurId) {
        const [dejaLie] = await db.select().from(vehiculeChauffeurs)
          .where(and(eq(vehiculeChauffeurs.vehiculeId, id), eq(vehiculeChauffeurs.chauffeurId, body.addChauffeurId)));
        if (!dejaLie) await db.insert(vehiculeChauffeurs).values({ vehiculeId: id, chauffeurId: body.addChauffeurId });
        if (!updated) [updated] = await db.select().from(vehicules).where(eq(vehicules.id, id));
      }

      return res.status(200).json(toApiFlat(updated));
    } catch (err) {
      if (err.code === "23505") {
        return res.status(400).json({ error: "Ce numéro de châssis ou d'immatriculation est déjà utilisé par un autre véhicule." });
      }
      console.error("PATCH /api/vehicules:", err);
      return res.status(500).json({ error: "Erreur lors de la mise à jour du véhicule." });
    }
  }

  if (req.method === "DELETE") {
    if (!(await assertOwnership())) return;

    const achats = await db.select().from(achatsCarburant).where(eq(achatsCarburant.vehiculeId, id));
    if (achats.length > 0) {
      return res.status(400).json({ error: `Impossible de supprimer ce véhicule : ${achats.length} achat(s) de carburant sont rattachés à son historique.` });
    }
    await db.delete(historiqueProprietaires).where(eq(historiqueProprietaires.vehiculeId, id));
    await db.delete(vehiculeChauffeurs).where(eq(vehiculeChauffeurs.vehiculeId, id));
    await db.delete(affectations).where(eq(affectations.vehiculeId, id));

    const [deleted] = await db.delete(vehicules).where(eq(vehicules.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Véhicule introuvable" });
    return res.status(200).json({ deleted: true });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
