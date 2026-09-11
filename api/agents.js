import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { agents } from "../db/schema.js";
import { requireAuth } from "../lib/auth.js";

function toApi(row) {
  const { pinCode, ...rest } = row;
  return { ...rest, pinConfigure: !!pinCode };
}

// Qui peut créer/gérer des agents, et pour quel périmètre :
//   admin              -> n'importe quel parentType/parentId
//   commission_mixte   -> uniquement parentType="commission_mixte", parentId = la sienne
//   syndicat           -> uniquement parentType="syndicat", parentId = le sien
function allowedParent(auth) {
  if (auth.role === "commission_mixte") return { parentType: "commission_mixte", parentId: auth.commissionMixteId };
  if (auth.role === "syndicat") return { parentType: "syndicat", parentId: auth.syndicatId };
  return null; // admin : pas de restriction
}

export default async function handler(req, res) {
  const idParam = req.query.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const auth = requireAuth(req, res);
  if (!auth) return;

  if (auth.role !== "admin" && auth.role !== "commission_mixte" && auth.role !== "syndicat") {
    return res.status(403).json({ error: "Réservé à l'administrateur général, à une commission mixte ou à un collectif (syndicat)." });
  }

  if (!id) {
    if (req.method === "GET") {
      let rows = await db.select().from(agents);
      const restriction = allowedParent(auth);
      if (restriction) {
        rows = rows.filter((a) => a.parentType === restriction.parentType && a.parentId === restriction.parentId);
      }
      return res.status(200).json(rows.map(toApi));
    }

    if (req.method === "POST") {
      const body = req.body || {};
      if (!body.nom || !body.prenoms || !body.login || !body.pinCode) {
        return res.status(400).json({ error: "nom, prenoms, login et pinCode sont requis" });
      }
      const restriction = allowedParent(auth);
      const parentType = restriction ? restriction.parentType : (body.parentType || "admin");
      const parentId = restriction ? restriction.parentId : (body.parentId || null);

      let created;
      try {
        [created] = await db.insert(agents).values({
          nom: body.nom,
          prenoms: body.prenoms,
          contact1: body.contact1 || null,
          login: body.login,
          pinCode: body.pinCode,
          parentType,
          parentId,
        }).returning();
      } catch (err) {
        if (err.code === "23505") {
          return res.status(400).json({ error: "Cet identifiant est déjà utilisé par un autre agent." });
        }
        console.error("POST /api/agents:", err);
        return res.status(500).json({ error: "Erreur lors de la création de l'agent." });
      }
      return res.status(201).json(toApi(created));
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  async function assertOwnership() {
    if (auth.role === "admin") return true;
    const [a] = await db.select().from(agents).where(eq(agents.id, id));
    if (!a) { res.status(404).json({ error: "Agent introuvable" }); return false; }
    const restriction = allowedParent(auth);
    if (restriction && a.parentType === restriction.parentType && a.parentId === restriction.parentId) return true;
    res.status(403).json({ error: "Cet agent n'appartient pas à votre périmètre." });
    return false;
  }

  if (req.method === "PATCH") {
    if (!(await assertOwnership())) return;
    const body = req.body || {};
    const patch = {};
    if ("nom" in body) patch.nom = body.nom;
    if ("prenoms" in body) patch.prenoms = body.prenoms;
    if ("contact1" in body) patch.contact1 = body.contact1;
    if ("login" in body) patch.login = body.login;
    if ("pinCode" in body && body.pinCode) patch.pinCode = body.pinCode;
    if ("actif" in body) patch.actif = !!body.actif;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }

    try {
      const [updated] = await db.update(agents).set(patch).where(eq(agents.id, id)).returning();
      if (!updated) return res.status(404).json({ error: "Agent introuvable" });
      return res.status(200).json(toApi(updated));
    } catch (err) {
      if (err.code === "23505") {
        return res.status(400).json({ error: "Cet identifiant est déjà utilisé par un autre agent." });
      }
      console.error("PATCH /api/agents:", err);
      return res.status(500).json({ error: "Erreur lors de la mise à jour de l'agent." });
    }
  }

  if (req.method === "DELETE") {
    if (!(await assertOwnership())) return;
    const [deleted] = await db.delete(agents).where(eq(agents.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Agent introuvable" });
    return res.status(200).json({ deleted: true });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
