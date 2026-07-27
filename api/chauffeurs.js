import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { chauffeurs } from "../db/schema.js";
import { requireAuth } from "../lib/auth.js";

function toApi(row) {
  const { photoUrl, qrPaiementUrl, ...rest } = row;
  return { ...rest, photo: photoUrl, qrPaiement: qrPaiementUrl };
}
function toDb(body) {
  const { photo, qrPaiement, ...rest } = body;
  return { ...rest, photoUrl: photo ?? null, qrPaiementUrl: qrPaiement ?? null };
}

export default async function handler(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    const rows = auth.role === "gare"
      ? await db.select().from(chauffeurs).where(eq(chauffeurs.gareId, auth.gareId))
      : await db.select().from(chauffeurs);
    return res.status(200).json(rows.map(toApi));
  }

  if (req.method === "POST") {
    const body = req.body || {};
    if (!body.nom || !body.prenoms || !body.cni || !body.permisNumero || !body.permisDateFin) {
      return res.status(400).json({ error: "nom, prenoms, cni, permisNumero et permisDateFin sont requis" });
    }
    const values = toDb(body);
    if (auth.role === "gare") values.gareId = auth.gareId;
    const [created] = await db.insert(chauffeurs).values(values).returning();
    return res.status(201).json(toApi(created));
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
