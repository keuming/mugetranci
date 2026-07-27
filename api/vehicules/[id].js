import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  vehicules, historiqueProprietaires, vehiculeChauffeurs, affectations, achatsCarburant,
} from "../../db/schema.js";

function toApi(row) {
  const { photoUrl, ...rest } = row;
  return { ...rest, photo: photoUrl };
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PATCH") {
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
      return res.status(200).json(toApi(updated));
    } catch (err) {
      if (err.code === "23505") {
        return res.status(400).json({ error: "Ce numéro de châssis ou d'immatriculation est déjà utilisé par un autre véhicule." });
      }
      console.error("PATCH /api/vehicules/[id]:", err);
      return res.status(500).json({ error: "Erreur lors de la mise à jour du véhicule." });
    }
  }

  if (req.method === "DELETE") {
    const achats = await db.select().from(achatsCarburant).where(eq(achatsCarburant.vehiculeId, id));
    if (achats.length > 0) {
      return res.status(400).json({ error: `Impossible de supprimer ce véhicule : ${achats.length} achat(s) de carburant sont rattachés à son historique.` });
    }
    // Ces tables ne sont que de l'historique/liaison propres au véhicule : suppression en cascade sûre.
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
