import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { lignes } from "../db/schema.js";
import { requireAuth } from "../lib/auth.js";

export default async function handler(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    const rows = auth.role === "gare"
      ? await db.select().from(lignes).where(eq(lignes.gareId, auth.gareId))
      : await db.select().from(lignes);
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const gareId = auth.role === "gare" ? auth.gareId : body.gareId;
    if (!gareId || !body.lieuDepart || !body.lieuArrivee || !body.cout) {
      return res.status(400).json({ error: "gareId, lieuDepart, lieuArrivee et cout sont requis" });
    }
    const [created] = await db.insert(lignes).values({
      gareId,
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
