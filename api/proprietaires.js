import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { proprietaires } from "../db/schema.js";
import { requireAuth } from "../lib/auth.js";

function toApi(row) {
  const { photoUrl, ...rest } = row;
  return { ...rest, photo: photoUrl };
}
function toDb(body) {
  const { photo, ...rest } = body;
  return { ...rest, photoUrl: photo ?? null };
}

export default async function handler(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    const rows = auth.role === "gare"
      ? await db.select().from(proprietaires).where(eq(proprietaires.gareId, auth.gareId))
      : await db.select().from(proprietaires);
    return res.status(200).json(rows.map(toApi));
  }

  if (req.method === "POST") {
    const body = req.body || {};
    if (!body.nom || !body.prenoms || !body.cni) {
      return res.status(400).json({ error: "nom, prenoms et cni sont requis" });
    }
    const values = toDb(body);
    if (auth.role === "gare") values.gareId = auth.gareId;
    const [created] = await db.insert(proprietaires).values(values).returning();
    return res.status(201).json(toApi(created));
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
