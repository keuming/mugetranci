import { db } from "../db/index.js";
import { lignes } from "../db/schema.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const rows = await db.select().from(lignes);
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const body = req.body || {};
    if (!body.gareId || !body.lieuDepart || !body.lieuArrivee || !body.cout) {
      return res.status(400).json({ error: "gareId, lieuDepart, lieuArrivee et cout sont requis" });
    }
    const [created] = await db.insert(lignes).values({
      gareId: body.gareId,
      lieuDepart: body.lieuDepart,
      lieuArrivee: body.lieuArrivee,
      cout: Math.round(Number(body.cout)),
      chefNom: body.chefNom || null,
      chefContact: body.chefContact || null,
    }).returning();
    return res.status(201).json(created);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
