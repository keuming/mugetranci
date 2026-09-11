import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  vehicules, historiqueProprietaires, vehiculeChauffeurs, affectations, achatsCarburant, syndicats, chauffeurs,
} from "../db/schema.js";
import { requireAuth } from "../lib/auth.js";

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
function toDbVehicule(body) {
  const { photo, documents = {}, chauffeurIds, historiqueProprietaires: _h, ...rest } = body;
  return {
    ...rest,
    marque: rest.marque || null,
    modele: rest.modele || null,
    chassis: rest.chassis || null, // nullable + unique : jamais de chaîne vide, sinon conflit d'unicité entre dossiers sans châssis renseigné
    photoUrl: photo ?? null,
    visiteTechniqueDateFin: documents.visiteTechnique || null,
    assuranceAutoDateFin: documents.assuranceAuto || null,
    vignetteDateFin: documents.vignette || null,
    carteStationnementDateFin: documents.carteStationnement || null,
  };
}

export default async function handler(req, res) {
  const idParam = req.query.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const auth = requireAuth(req, res);
  if (!auth) return;

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
      const { chauffeurIds = [] } = body;

      if (!body.carteGrise || !body.immatriculation) {
        return res.status(400).json({ error: "carteGrise et immatriculation sont requis pour créer le dossier" });
      }

      const dbValues = toDbVehicule(body);
      if (auth.role === "syndicat") dbValues.syndicatId = auth.syndicatId;
      if (auth.role === "agent" && auth.parentType === "syndicat") dbValues.syndicatId = auth.parentId;

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
    if ("categorie" in body) patch.categorie = body.categorie;
    if ("immatriculation" in body) patch.immatriculation = body.immatriculation;
    if ("dateMiseCirculation" in body) patch.dateMiseCirculation = body.dateMiseCirculation || null;
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
      if (body.addChauffeurId) {
        await db.insert(vehiculeChauffeurs).values({ vehiculeId: id, chauffeurId: body.addChauffeurId });
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
