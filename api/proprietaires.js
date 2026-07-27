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
  const idParam = req.query.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const auth = requireAuth(req, res);
  if (!auth) return;

  if (!id) {
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

  async function assertOwnership() {
    if (auth.role === "admin") return true;
    const [p] = await db.select().from(proprietaires).where(eq(proprietaires.id, id));
    if (!p) { res.status(404).json({ error: "Propriétaire introuvable" }); return false; }
    if (p.gareId !== auth.gareId) { res.status(403).json({ error: "Ce propriétaire n'appartient pas à votre gare." }); return false; }
    return true;
  }

  if (req.method === "PATCH") {
    if (!(await assertOwnership())) return;

    const body = req.body || {};
    const patch = {};
    if ("photo" in body) patch.photoUrl = body.photo;
    if ("nom" in body) patch.nom = body.nom;
    if ("prenoms" in body) patch.prenoms = body.prenoms;
    if ("carteTransporteurNumero" in body) patch.carteTransporteurNumero = body.carteTransporteurNumero;
    if ("numeroPermis" in body) patch.numeroPermis = body.numeroPermis;
    if ("contact1" in body) patch.contact1 = body.contact1;
    if ("contact2" in body) patch.contact2 = body.contact2;
    if ("contact3" in body) patch.contact3 = body.contact3;
    if ("email" in body) patch.email = body.email;
    if ("ville" in body) patch.ville = body.ville;
    if ("quartier" in body) patch.quartier = body.quartier;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }

    const [updated] = await db.update(proprietaires).set(patch).where(eq(proprietaires.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Propriétaire introuvable" });
    return res.status(200).json(toApi(updated));
  }

  if (req.method === "DELETE") {
    if (!(await assertOwnership())) return;
    const [deleted] = await db.delete(proprietaires).where(eq(proprietaires.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Propriétaire introuvable" });
    return res.status(200).json({ deleted: true });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
