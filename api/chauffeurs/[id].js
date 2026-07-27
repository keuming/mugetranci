import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { chauffeurs } from "../../db/schema.js";

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
    if ("nom" in body) patch.nom = body.nom;
    if ("prenoms" in body) patch.prenoms = body.prenoms;
    if ("contact1" in body) patch.contact1 = body.contact1;
    if ("contact2" in body) patch.contact2 = body.contact2;
    if ("contact3" in body) patch.contact3 = body.contact3;
    if ("email" in body) patch.email = body.email;
    if ("permisNumero" in body) patch.permisNumero = body.permisNumero;
    if ("permisDateFin" in body) patch.permisDateFin = body.permisDateFin;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }

    const [updated] = await db.update(chauffeurs).set(patch).where(eq(chauffeurs.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Chauffeur introuvable" });
    return res.status(200).json(toApi(updated));
  }

  res.setHeader("Allow", "PATCH");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
