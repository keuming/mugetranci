import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { vehicules, historiqueProprietaires, vehiculeChauffeurs } from "../db/schema.js";

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
  if (req.method === "GET") {
    const [rows, junctions, historiques] = await Promise.all([
      db.select().from(vehicules),
      db.select().from(vehiculeChauffeurs).where(eq(vehiculeChauffeurs.actif, true)),
      db.select().from(historiqueProprietaires),
    ]);
    const result = rows.map((v) => {
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

    const [vehicule] = await db.insert(vehicules).values(toDbVehicule(body)).returning();

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
