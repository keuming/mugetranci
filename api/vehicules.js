import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { vehicules, historiqueProprietaires, vehiculeChauffeurs } from "../db/schema.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const rows = await db.select().from(vehicules);
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const { chauffeurIds = [], ...vehiculeData } = body;

    if (!vehiculeData.marque || !vehiculeData.modele || !vehiculeData.chassis || !vehiculeData.immatriculation) {
      return res.status(400).json({ error: "marque, modele, chassis et immatriculation sont requis" });
    }

    const [vehicule] = await db.insert(vehicules).values(vehiculeData).returning();

    if (vehiculeData.proprietaireId) {
      await db.insert(historiqueProprietaires).values({
        vehiculeId: vehicule.id,
        proprietaireId: vehiculeData.proprietaireId,
        depuis: vehiculeData.dateMiseCirculation || new Date().toISOString().slice(0, 10),
      });
    }

    for (const chauffeurId of chauffeurIds) {
      await db.insert(vehiculeChauffeurs).values({ vehiculeId: vehicule.id, chauffeurId });
    }

    return res.status(201).json(vehicule);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
