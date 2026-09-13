import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { syndicats, proprietaires, associations } from "../db/schema.js";
import { requireAuth } from "../lib/auth.js";

function toApi(row) {
  const { pinCode, ...rest } = row;
  return { ...rest, pinConfigure: !!pinCode };
}

/* Sous-ressource "associations" (syndicats de base sous un collectif),
   servie par cette meme fonction via ?resource=associations pour rester
   sous la limite de 12 fonctions serverless du plan Vercel Hobby. */
async function handleAssociations(req, res, id) {
  const auth = requireAuth(req, res);
  if (!auth) return;

  if (!id) {
    if (req.method === "GET") {
      const rows = await db.select().from(associations);
      return res.status(200).json(rows);
    }
    if (req.method === "POST") {
      if (auth.role !== "admin" && auth.role !== "commission_mixte" && auth.role !== "syndicat") {
        return res.status(403).json({ error: "Réservé à l'admin général, à une commission mixte ou à un collectif." });
      }
      const body = req.body || {};
      if (!body.syndicatId || !body.nom) {
        return res.status(400).json({ error: "syndicatId (collectif) et nom sont requis" });
      }
      if (auth.role === "syndicat" && body.syndicatId !== auth.syndicatId) {
        return res.status(403).json({ error: "Ce collectif n'est pas le vôtre." });
      }
      const [created] = await db.insert(associations).values({
        syndicatId: body.syndicatId,
        nom: body.nom,
        sigle: body.sigle || null,
        logoUrl: body.logoUrl || null,
        presidentNom: body.presidentNom || null,
        presidentContact: body.presidentContact || null,
      }).returning();
      return res.status(201).json(created);
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const [existing] = await db.select().from(associations).where(eq(associations.id, id));
  if (!existing) return res.status(404).json({ error: "Association introuvable" });
  if (auth.role === "syndicat" && existing.syndicatId !== auth.syndicatId) {
    return res.status(403).json({ error: "Cette association n'appartient pas à votre collectif." });
  }
  if (auth.role !== "admin" && auth.role !== "commission_mixte" && auth.role !== "syndicat") {
    return res.status(403).json({ error: "Modification non autorisée." });
  }

  if (req.method === "PATCH") {
    const body = req.body || {};
    const patch = {};
    ["nom", "sigle", "logoUrl", "presidentNom", "presidentContact"].forEach((k) => {
      if (k in body) patch[k] = body[k] || null;
    });
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    const [updated] = await db.update(associations).set(patch).where(eq(associations.id, id)).returning();
    return res.status(200).json(updated);
  }

  if (req.method === "DELETE") {
    await db.delete(associations).where(eq(associations.id, id));
    return res.status(200).json({ deleted: true });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}

export default async function handler(req, res) {
  const idParam = req.query.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  if (req.query.resource === "associations") {
    return handleAssociations(req, res, id);
  }

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
      // Créé par l'admin général (pour n'importe quelle commission) ou par
      // une commission mixte elle-même (uniquement pour sa propre commission).
      const auth = requireAuth(req, res);
      if (!auth) return;
      if (auth.role !== "admin" && auth.role !== "commission_mixte") {
        return res.status(403).json({ error: "Réservé à l'administrateur général ou à une commission mixte." });
      }

      const body = req.body || {};
      const commissionMixteId = auth.role === "commission_mixte" ? auth.commissionMixteId : body.commissionMixteId;
      if (!body.nom || !commissionMixteId) {
        return res.status(400).json({ error: "nom et commissionMixteId sont requis" });
      }
      if (auth.role === "commission_mixte" && body.commissionMixteId && body.commissionMixteId !== auth.commissionMixteId) {
        return res.status(403).json({ error: "Vous ne pouvez créer un syndicat que pour votre propre commission mixte." });
      }
      if (body.pinCode && !/^\d{4}$/.test(body.pinCode)) {
        return res.status(400).json({ error: "Le code PIN doit comporter exactement 4 chiffres" });
      }
      try {
        const [created] = await db.insert(syndicats).values({
          commissionMixteId,
          nom: body.nom,
          sigle: body.sigle || null,
          logoUrl: body.logoUrl || null,
          commune: body.commune || null,
          type: body.type || null,
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

  const auth = requireAuth(req, res);
  if (!auth) return;

  async function assertOwnership(allowSelfSyndicat) {
    if (auth.role === "admin") return true;
    if (allowSelfSyndicat && auth.role === "syndicat" && auth.syndicatId === id) return true;
    if (auth.role !== "commission_mixte") {
      res.status(403).json({ error: "Modification réservée à l'admin général, à la commission mixte, ou au syndicat pour son propre profil." });
      return false;
    }
    const [s] = await db.select().from(syndicats).where(eq(syndicats.id, id));
    if (!s) { res.status(404).json({ error: "Syndicat introuvable" }); return false; }
    if (s.commissionMixteId !== auth.commissionMixteId) { res.status(403).json({ error: "Ce syndicat n'appartient pas à votre commission mixte." }); return false; }
    return true;
  }

  if (req.method === "PATCH") {
    if (!(await assertOwnership(true))) return;

    const body = req.body || {};
    if (body.pinCode && !/^\d{4}$/.test(body.pinCode)) {
      return res.status(400).json({ error: "Le code PIN doit comporter exactement 4 chiffres" });
    }
    const patch = {};
    ["nom", "sigle", "logoUrl", "commune", "type", "presidentNom", "presidentContact", "login"].forEach((k) => {
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
    if (!(await assertOwnership())) return;
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
