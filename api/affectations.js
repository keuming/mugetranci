import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { affectations } from "../db/schema.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const rows = await db.select().from(affectations);
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const body = req.body || {};
    if (!body.vehiculeId) {
      return res.status(400).json({ error: "vehiculeId est requis" });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Clôture toute affectation active existante pour ce véhicule
    // (désaffectation, préalable systématique à une réaffectation).
    await db.update(affectations)
      .set({ actif: false, dateFin: today })
      .where(and(eq(affectations.vehiculeId, body.vehiculeId), eq(affectations.actif, true)));

    // Désaffectation pure : pas de nouvelle affectation à créer.
    if (body.desaffecter) {
      return res.status(200).json({ desaffecte: true });
    }

    if (!body.gareId || !body.ligneId) {
      return res.status(400).json({ error: "gareId et ligneId sont requis pour une (ré)affectation" });
    }

    const [created] = await db.insert(affectations).values({
      vehiculeId: body.vehiculeId,
      gareId: body.gareId,
      ligneId: body.ligneId,
      dateAffectation: body.dateAffectation || today,
    }).returning();

    return res.status(201).json(created);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
