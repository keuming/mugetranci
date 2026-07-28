import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { syndicats, proprietaires } from "../db/schema.js";
import { requireAuth, requireAdmin } from "../lib/auth.js";

function toApi(row) {
  const { pinCode, ...rest } = row;
  return { ...rest, pinConfigure: !!pinCode };
}

export default async function handler(req, res) {
  const idParam = req.query.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  if (!id) {
    if (req.method === "GET") {
      const auth = requireAuth(req, res);
      if (!auth) return;
      let rows = await db.select().from(syndicats);
      if (auth.role === "commission_mixte") {
        rows = rows.filter((s) => s.commissionMixteId === auth.commissionMixteId);
      } else if (auth.role === "syndicat") {
        rows = rows.filter((s) => s.id === auth.syndicatId);
      }
      return res.status(200).json(rows.map(toApi));
    }

    if (req.method === "POST") {
      const auth = requireAdmin(req, res); // seul l'admin général crée un syndicat
      if (!auth) return;
      const body = req.body || {};
      if (!body.nom || !body.commissionMixteId) {
        return res.status(400).json({ error: "nom et commissionMixteId sont requis" });
      }
      if (body.pinCode && !/^\d{4}$/.test(body.pinCode)) {
        return res.status(400).json({ error: "Le code PIN doit comporter exactement 4 chiffres" });
      }
      try {
        const [created] = await db.insert(syndicats).values({
          commissionMixteId: body.commissionMixteId,
          nom: body.nom,
          presidentNom: body.presidentNom || null,
          presidentContact: body.presidentContact || null,
          login: body.login || null,
          pinCode: body.pinCode || null,
        }).returning();
        return res.status(201).json(toApi(created));
      } catch (err) {
        if (err.code === "23505") {
          return res.status(400).json({ error: "Ce numéro de téléphone (login) est déjà utilisé." });
        }
        console.error("POST /api/syndicats:", err);
        return res.status(500).json({ error: "Erreur lors de l'enregistrement." });
      }
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const auth = requireAdmin(req, res); // modification/suppression réservées à l'admin général
  if (!auth) return;

  if (req.method === "PATCH") {
    const body = req.body || {};
    if (body.pinCode && !/^\d{4}$/.test(body.pinCode)) {
      return res.status(400).json({ error: "Le code PIN doit comporter exactement 4 chiffres" });
    }
    const patch = {};
    ["nom", "presidentNom", "presidentContact", "login"].forEach((k) => {
      if (k in body) patch[k] = body[k] || null;
    });
    if (body.pinCode) patch.pinCode = body.pinCode;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }

    try {
      const [updated] = await db.update(syndicats).set(patch).where(eq(syndicats.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Syndicat introuvable" });
      return res.status(200).json(toApi(updated));
    } catch (err) {
      if (err.code === "23505") {
        return res.status(400).json({ error: "Ce numéro de téléphone (login) est déjà utilisé." });
      }
      console.error("PATCH /api/syndicats:", err);
      return res.status(500).json({ error: "Erreur lors de la mise à jour." });
    }
  }

  if (req.method === "DELETE") {
    const members = await db.select().from(proprietaires).where(eq(proprietaires.syndicatId, id));
    if (members.length > 0) {
      return res.status(400).json({ error: `Impossible de supprimer : ${members.length} membre(s) sont rattachés à ce syndicat.` });
    }
    const [deleted] = await db.delete(syndicats).where(eq(syndicats.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Syndicat introuvable" });
    return res.status(200).json({ deleted: true });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
