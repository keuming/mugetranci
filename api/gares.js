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
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
