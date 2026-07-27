import { db } from "../db/index.js";
import { proprietaires } from "../db/schema.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const rows = await db.select().from(proprietaires);
    return res.status(200).json(rows);
  }

  if (req.method === "POST") {
    const body = req.body || {};
    if (!body.nom || !body.prenoms || !body.cni) {
      return res.status(400).json({ error: "nom, prenoms et cni sont requis" });
    }
    const [created] = await db.insert(proprietaires).values(body).returning();
    return res.status(201).json(created);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
