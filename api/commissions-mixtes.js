import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { commissionsMixtes, syndicats } from "../db/schema.js";
import { requireAuth, requireAdmin } from "../lib/auth.js";

function toApi(row) {
  const { pinCode, ...rest } = row; // le PIN ne transite jamais côté client
  return {
    ...rest,
    latitude: row.latitude !== null ? Number(row.latitude) : null,
    longitude: row.longitude !== null ? Number(row.longitude) : null,
    pinConfigure: !!pinCode,
  };
}

export default async function handler(req, res) {
  const idParam = req.query.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  if (!id) {
    if (req.method === "GET") {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const rows = await db.select().from(commissionsMixtes);
      return res.status(200).json(rows.map(toApi));
    }

    if (req.method === "POST") {
      const auth = requireAdmin(req, res);
      if (!auth) return;
      const body = req.body || {};
      if (!body.nom || !body.commune) {
        return res.status(400).json({ error: "nom et commune sont requis" });
      }
      if (body.pinCode && !/^\d{4}$/.test(body.pinCode)) {
        return res.status(400).json({ error: "Le code PIN doit comporter exactement 4 chiffres" });
      }
      if (body.latitude !== undefined && body.latitude !== "" && body.latitude !== null && (Number(body.latitude) < -90 || Number(body.latitude) > 90)) {
        return res.status(400).json({ error: "La latitude doit être comprise entre -90 et 90" });
      }
      if (body.longitude !== undefined && body.longitude !== "" && body.longitude !== null && (Number(body.longitude) < -180 || Number(body.longitude) > 180)) {
        return res.status(400).json({ error: "La longitude doit être comprise entre -180 et 180" });
      }

      try {
        const [created] = await db.insert(commissionsMixtes).values({
          nom: body.nom,
          sigle: body.sigle || null,
          logoUrl: body.logoUrl || null,
          commune: body.commune,
          localisation: body.localisation || null,
          latitude: body.latitude !== undefined && body.latitude !== "" ? String(body.latitude) : null,
          longitude: body.longitude !== undefined && body.longitude !== "" ? String(body.longitude) : null,
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
        console.error("POST /api/commissions-mixtes:", err);
        return res.status(500).json({ error: "Erreur lors de l'enregistrement." });
      }
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const auth = requireAdmin(req, res);
  if (!auth) return;

  if (req.method === "PATCH") {
    const body = req.body || {};
    if (body.pinCode && !/^\d{4}$/.test(body.pinCode)) {
      return res.status(400).json({ error: "Le code PIN doit comporter exactement 4 chiffres" });
    }
    if (body.latitude !== undefined && body.latitude !== "" && body.latitude !== null && (Number(body.latitude) < -90 || Number(body.latitude) > 90)) {
      return res.status(400).json({ error: "La latitude doit être comprise entre -90 et 90" });
    }
    if (body.longitude !== undefined && body.longitude !== "" && body.longitude !== null && (Number(body.longitude) < -180 || Number(body.longitude) > 180)) {
      return res.status(400).json({ error: "La longitude doit être comprise entre -180 et 180" });
    }

    const patch = {};
    ["nom", "sigle", "logoUrl", "commune", "localisation", "presidentNom", "presidentContact", "login"].forEach((k) => {
      if (k in body) patch[k] = body[k] || null;
    });
    if (body.pinCode) patch.pinCode = body.pinCode;
    if ("latitude" in body) patch.latitude = body.latitude !== "" && body.latitude !== null ? String(body.latitude) : null;
    if ("longitude" in body) patch.longitude = body.longitude !== "" && body.longitude !== null ? String(body.longitude) : null;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }

    try {
      const [updated] = await db.update(commissionsMixtes).set(patch).where(eq(commissionsMixtes.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Commission mixte introuvable" });
      return res.status(200).json(toApi(updated));
    } catch (err) {
      if (err.code === "23505") {
        return res.status(400).json({ error: "Ce numéro de téléphone (login) est déjà utilisé." });
      }
      console.error("PATCH /api/commissions-mixtes:", err);
      return res.status(500).json({ error: "Erreur lors de la mise à jour." });
    }
  }

  if (req.method === "DELETE") {
    const existingSyndicats = await db.select().from(syndicats).where(eq(syndicats.commissionMixteId, id));
    if (existingSyndicats.length > 0) {
      return res.status(400).json({ error: `Impossible de supprimer : ${existingSyndicats.length} syndicat(s) y sont rattachés. Supprimez-les d'abord.` });
    }
    const [deleted] = await db.delete(commissionsMixtes).where(eq(commissionsMixtes.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Commission mixte introuvable" });
    return res.status(200).json({ deleted: true });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
