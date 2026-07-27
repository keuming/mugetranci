import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { gares, lignes } from "../../db/schema.js";

function toApi(row) {
  return {
    ...row,
    latitude: row.latitude !== null ? Number(row.latitude) : null,
    longitude: row.longitude !== null ? Number(row.longitude) : null,
  };
}

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PATCH") {
    const body = req.body || {};
    if (body.pinCode && !/^\d{4}$/.test(body.pinCode)) {
      return res.status(400).json({ error: "Le code PIN doit comporter exactement 4 chiffres" });
    }
    if (body.latitude !== undefined && body.latitude !== "" && body.latitude !== null && (Number(body.latitude) < -90 || Number(body.latitude) > 90)) {
      return res.status(400).json({ error: "La latitude doit être comprise entre -90 et 90" });
    }
    if (body.longitude !== undefined && body.longitude !== "" && body.longitude !== null && (Number(body.longitude) < -180 || Number(body.longitude) > 180)) {
      return res.status(400).json({ error: "La longitude doit être comprise entre -180 et 180" });
    }

    const patch = {};
    ["nom", "commune", "localisation", "chefNom", "chefContact", "login", "pinCode"].forEach((k) => {
      if (k in body) patch[k] = body[k] || null;
    });
    if ("latitude" in body) patch.latitude = body.latitude !== "" && body.latitude !== null ? String(body.latitude) : null;
    if ("longitude" in body) patch.longitude = body.longitude !== "" && body.longitude !== null ? String(body.longitude) : null;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }

    try {
      const [updated] = await db.update(gares).set(patch).where(eq(gares.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Gare introuvable" });
      return res.status(200).json(toApi(updated));
    } catch (err) {
      if (err.code === "23505") {
        return res.status(400).json({ error: "Ce numéro de téléphone (login) est déjà utilisé par une autre gare." });
      }
      console.error("PATCH /api/gares/[id]:", err);
      return res.status(500).json({ error: "Erreur lors de la mise à jour de la gare." });
    }
  }

  if (req.method === "DELETE") {
    const existingLignes = await db.select().from(lignes).where(eq(lignes.gareId, id));
    if (existingLignes.length > 0) {
      return res.status(400).json({ error: `Impossible de supprimer cette gare : ${existingLignes.length} ligne(s) y sont rattachées. Supprimez-les d'abord.` });
    }
    const [deleted] = await db.delete(gares).where(eq(gares.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Gare introuvable" });
    return res.status(200).json({ deleted: true });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
