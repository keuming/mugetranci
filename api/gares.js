import { db } from "../db/index.js";
import { gares } from "../db/schema.js";

function toApi(row) {
  return {
    ...row,
    latitude: row.latitude !== null ? Number(row.latitude) : null,
    longitude: row.longitude !== null ? Number(row.longitude) : null,
  };
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const rows = await db.select().from(gares);
    return res.status(200).json(rows.map(toApi));
  }

  if (req.method === "POST") {
    const body = req.body || {};
    if (!body.nom || !body.commune) {
      return res.status(400).json({ error: "nom et commune sont requis" });
    }
    if (body.pinCode && !/^\d{4}$/.test(body.pinCode)) {
      return res.status(400).json({ error: "Le code PIN doit comporter exactement 4 chiffres" });
    }
    if (body.latitude !== undefined && body.latitude !== "" && (Number(body.latitude) < -90 || Number(body.latitude) > 90)) {
      return res.status(400).json({ error: "La latitude doit être comprise entre -90 et 90" });
    }
    if (body.longitude !== undefined && body.longitude !== "" && (Number(body.longitude) < -180 || Number(body.longitude) > 180)) {
      return res.status(400).json({ error: "La longitude doit être comprise entre -180 et 180" });
    }

    try {
      const [created] = await db.insert(gares).values({
        nom: body.nom,
        commune: body.commune,
        localisation: body.localisation || null,
        latitude: body.latitude !== undefined && body.latitude !== "" ? String(body.latitude) : null,
        longitude: body.longitude !== undefined && body.longitude !== "" ? String(body.longitude) : null,
        chefNom: body.chefNom || null,
        chefContact: body.chefContact || null,
        login: body.login || null,
        pinCode: body.pinCode || null,
      }).returning();
      return res.status(201).json(toApi(created));
    } catch (err) {
      if (err.code === "23505") {
        return res.status(400).json({ error: "Ce numéro de téléphone (login) est déjà utilisé par une autre gare." });
      }
      console.error("POST /api/gares:", err);
      return res.status(500).json({ error: "Erreur lors de l'enregistrement de la gare. Vérifiez les valeurs saisies." });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
