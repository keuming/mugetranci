import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  vehicules, historiqueProprietaires, vehiculeChauffeurs, affectations, achatsCarburant,
} from "../db/schema.js";
import { requireAuth } from "../lib/auth.js";

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

  if (!id) {
    if (req.method === "GET") {
      const [rows, junctions, historiques, allAffectations] = await Promise.all([
        db.select().from(vehicules),
        db.select().from(vehiculeChauffeurs).where(eq(vehiculeChauffeurs.actif, true)),
        db.select().from(historiqueProprietaires),
        db.select().from(affectations).where(eq(affectations.actif, true)),
      ]);

      let visibleRows = rows;
      if (auth.role === "gare") {
        const affectedIds = new Set(allAffectations.filter((a) => a.gareId === auth.gareId).map((a) => a.vehiculeId));
        visibleRows = rows.filter((v) => v.gareId === auth.gareId || affectedIds.has(v.id));
      }

      const result = visibleRows.map((v) => {
        const chauffeurIds = junctions.filter((j) => j.vehiculeId === v.id).map((j) => j.chauffeurId);
        const historique = historiques.filter((h) => h.vehiculeId === v.id);
        return toApiFull(v, chauffeurIds, historique);
      });
      return res.status(200).json(result);
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const { chauffeurIds = [] } = body;

      if (!body.marque || !body.modele || !body.chassis || !body.immatriculation) {
        return res.status(400).json({ error: "marque, modele, chassis et immatriculation sont requis" });
      }

      const dbValues = toDbVehicule(body);
      if (auth.role === "gare") dbValues.gareId = auth.gareId;

      const [vehicule] = await db.insert(vehicules).values(dbValues).returning();

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
    const [v] = await db.select().from(vehicules).where(eq(vehicules.id, id));
    if (!v) { res.status(404).json({ error: "Véhicule introuvable" }); return false; }
    if (v.gareId === auth.gareId) return true;
    const [aff] = await db.select().from(affectations).where(eq(affectations.vehiculeId, id));
    if (aff && aff.gareId === auth.gareId && aff.actif) return true;
    res.status(403).json({ error: "Ce véhicule n'appartient pas à votre gare." });
    return false;
  }

  if (req.method === "PATCH") {
    if (!(await assertOwnership())) return;

    const body = req.body || {};
    const documents = body.documents || {};
    const patch = {};
    if ("photo" in body) patch.photoUrl = body.photo;
    if ("marque" in body) patch.marque = body.marque;
    if ("modele" in body) patch.modele = body.modele;
    if ("chassis" in body) patch.chassis = body.chassis;
    if ("carteGrise" in body) patch.carteGrise = body.carteGrise;
    if ("nomCarteGrise" in body) patch.nomCarteGrise = body.nomCarteGrise;
    if ("immatriculation" in body) patch.immatriculation = body.immatriculation;
    if ("dateMiseCirculation" in body) patch.dateMiseCirculation = body.dateMiseCirculation || null;
    if ("visiteTechnique" in documents) patch.visiteTechniqueDateFin = documents.visiteTechnique || null;
    if ("assuranceAuto" in documents) patch.assuranceAutoDateFin = documents.assuranceAuto || null;
    if ("vignette" in documents) patch.vignetteDateFin = documents.vignette || null;
    if ("carteStationnement" in documents) patch.carteStationnementDateFin = documents.carteStationnement || null;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }

    try {
      const [updated] = await db.update(vehicules).set(patch).where(eq(vehicules.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Véhicule introuvable" });
      return res.status(200).json(toApiFlat(updated));
    } catch (err) {
      if (err.code === "23505") {
        return res.status(400).json({ error: "Ce numéro de châssis ou d'immatriculation est déjà utilisé par un autre véhicule." });
      }
      console.error("PATCH /api/vehicules/[id]:", err);
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
