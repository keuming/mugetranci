import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { vehicules } from "../../db/schema.js";

function toApi(row) {
  const { photoUrl, ...rest } = row;
  return { ...rest, photo: photoUrl };
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PATCH") {
    const body = req.body || {};
    const patch = {};
    if ("photo" in body) patch.photoUrl = body.photo;
    if ("marque" in body) patch.marque = body.marque;
    if ("modele" in body) patch.modele = body.modele;
    if ("carteGrise" in body) patch.carteGrise = body.carteGrise;
    if ("nomCarteGrise" in body) patch.nomCarteGrise = body.nomCarteGrise;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }

    const [updated] = await db.update(vehicules).set(patch).where(eq(vehicules.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Véhicule introuvable" });
    return res.status(200).json(toApi(updated));
  }

  res.setHeader("Allow", "PATCH");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
