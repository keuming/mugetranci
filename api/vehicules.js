import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { vehicules, historiqueProprietaires, vehiculeChauffeurs, affectations } from "../db/schema.js";
import { requireAuth } from "../lib/auth.js";

function toApi(vehicule, chauffeurIds = [], historique = []) {
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
  const auth = requireAuth(req, res);
  if (!auth) return;

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
      return toApi(v, chauffeurIds, historique);
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
    // Un compte gare ne peut créer un véhicule que pour sa propre gare (sécurité :
    // on ignore toute valeur de gareId envoyée par le client).
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

    return res.status(201).json(toApi(vehicule, chauffeurIds, historique));
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
