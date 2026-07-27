import { db } from "../db/index.js";
import { chauffeurs } from "../db/schema.js";

function toApi(row) {
  const { photoUrl, qrPaiementUrl, ...rest } = row;
  return { ...rest, photo: photoUrl, qrPaiement: qrPaiementUrl };
}
function toDb(body) {
  const { photo, qrPaiement, ...rest } = body;
  return { ...rest, photoUrl: photo ?? null, qrPaiementUrl: qrPaiement ?? null };
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const rows = await db.select().from(chauffeurs);
    return res.status(200).json(rows.map(toApi));
  }

  if (req.method === "POST") {
    const body = req.body || {};
    if (!body.nom || !body.prenoms || !body.cni || !body.permisNumero || !body.permisDateFin) {
      return res.status(400).json({ error: "nom, prenoms, cni, permisNumero et permisDateFin sont requis" });
    }
    const [created] = await db.insert(chauffeurs).values(toDb(body)).returning();
    return res.status(201).json(toApi(created));
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
