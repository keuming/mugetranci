import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { affectations } from "../db/schema.js";
import { requireAuth } from "../lib/auth.js";

export default async function handler(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    const rows = auth.role === "commission_mixte"
      ? await db.select().from(affectations).where(eq(affectations.commissionMixteId, auth.commissionMixteId))
      : await db.select().from(affectations);
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const body = req.body || {};
    if (!body.vehiculeId) {
      return res.status(400).json({ error: "vehiculeId est requis" });
    }
    if (auth.role === "commission_mixte") {
      return res.status(403).json({ error: "La commission mixte est en lecture seule sur les affectations." });
    }

    const today = new Date().toISOString().slice(0, 10);

    await db.update(affectations)
      .set({ actif: false, dateFin: today })
      .where(and(eq(affectations.vehiculeId, body.vehiculeId), eq(affectations.actif, true)));

    if (body.desaffecter) {
      return res.status(200).json({ desaffecte: true });
    }

    if (!body.commissionMixteId || !body.ligneId) {
      return res.status(400).json({ error: "commissionMixteId et ligneId sont requis pour une (ré)affectation" });
    }

    const [created] = await db.insert(affectations).values({
      vehiculeId: body.vehiculeId,
      commissionMixteId: body.commissionMixteId,
      ligneId: body.ligneId,
      dateAffectation: body.dateAffectation || today,
    }).returning();

    return res.status(201).json(created);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
