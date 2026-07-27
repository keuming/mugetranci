import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { gares, lignes } from "../../db/schema.js";
import { requireAuth, requireAdmin } from "../../lib/auth.js";

function toApi(row) {
  const { pinCode, ...rest } = row; // le PIN ne transite jamais côté client, admin inclus
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
    // /api/gares
    if (req.method === "GET") {
      const auth = requireAuth(req, res);
      if (!auth) return;
      const rows = await db.select().from(gares);
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

  // /api/gares/:id
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
    ["nom", "commune", "localisation", "chefNom", "chefContact", "login"].forEach((k) => {
      if (k in body) patch[k] = body[k] || null;
    });
    if (body.pinCode) patch.pinCode = body.pinCode;
    if ("latitude" in body) patch.latitude = body.latitude !== "" && body.latitude !== null ? String(body.latitude) : null;
    if ("longitude" in body) patch.longitude = body.longitude !== "" && body.longitude !== null ? String(body.longitude) : null;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }

    try {
      const [updated] = await db.update(gares).set(patch).where(eq(gares.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Gare introuvable" });
      return res.status(200).json(toApi(updated));
    } catch (err) {
      if (err.code === "23505") {
        return res.status(400).json({ error: "Ce numéro de téléphone (login) est déjà utilisé par une autre gare." });
      }
      console.error("PATCH /api/gares/[id]:", err);
      return res.status(500).json({ error: "Erreur lors de la mise à jour de la gare." });
    }
  }

  if (req.method === "DELETE") {
    const existingLignes = await db.select().from(lignes).where(eq(lignes.gareId, id));
    if (existingLignes.length > 0) {
      return res.status(400).json({ error: `Impossible de supprimer cette gare : ${existingLignes.length} ligne(s) y sont rattachées. Supprimez-les d'abord.` });
    }
    const [deleted] = await db.delete(gares).where(eq(gares.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Gare introuvable" });
    return res.status(200).json({ deleted: true });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
