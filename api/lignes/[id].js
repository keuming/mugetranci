import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { lignes, affectations } from "../../db/schema.js";

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method === "PATCH") {
    const body = req.body || {};
    const patch = {};
    if ("lieuDepart" in body) patch.lieuDepart = body.lieuDepart;
    if ("lieuArrivee" in body) patch.lieuArrivee = body.lieuArrivee;
    if ("cout" in body) patch.cout = Math.round(Number(body.cout));
    if ("chefNom" in body) patch.chefNom = body.chefNom || null;
    if ("chefContact" in body) patch.chefContact = body.chefContact || null;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }

    const [updated] = await db.update(lignes).set(patch).where(eq(lignes.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Ligne introuvable" });
    return res.status(200).json(updated);
  }

  if (req.method === "DELETE") {
    const activeAffectations = await db.select().from(affectations).where(eq(affectations.ligneId, id));
    const stillActive = activeAffectations.filter((a) => a.actif);
    if (stillActive.length > 0) {
      return res.status(400).json({ error: `Impossible de supprimer cette ligne : ${stillActive.length} véhicule(s) y sont actuellement affecté(s). Désaffectez-les d'abord.` });
    }
    const [deleted] = await db.delete(lignes).where(eq(lignes.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Ligne introuvable" });
    return res.status(200).json({ deleted: true });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
