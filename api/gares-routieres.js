import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { garesRoutieres, affectations } from "../db/schema.js";
import { requireAuth } from "../lib/auth.js";

function toApi(row) {
  const { pinCode, ...rest } = row;
  return { ...rest, pinConfigure: !!pinCode };
}

export default async function handler(req, res) {
  const idParam = req.query.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const auth = requireAuth(req, res);
  if (!auth) return;

  if (!id) {
    if (req.method === "GET") {
      let rows = await db.select().from(garesRoutieres);
      if (auth.role === "syndicat") {
        rows = rows.filter((g) => g.syndicatId === auth.syndicatId);
      } else if (auth.role === "gare") {
        rows = rows.filter((g) => g.id === auth.gareRoutiereId);
      }
      // admin et commission_mixte voient l'ensemble (lecture)
      return res.status(200).json(rows.map(toApi));
    }

    if (req.method === "POST") {
      // Créée par le syndicat lui-même (ou par l'admin pour n'importe quel syndicat).
      if (auth.role !== "admin" && auth.role !== "syndicat") {
        return res.status(403).json({ error: "Réservé à l'administrateur général ou à un syndicat." });
      }
      const body = req.body || {};
      const syndicatId = auth.role === "syndicat" ? auth.syndicatId : body.syndicatId;
      if (!body.nom || !syndicatId) {
        return res.status(400).json({ error: "nom et syndicatId sont requis" });
      }
      if (body.pinCode && !/^\d{4}$/.test(body.pinCode)) {
        return res.status(400).json({ error: "Le code PIN doit comporter exactement 4 chiffres" });
      }
      try {
        const [created] = await db.insert(garesRoutieres).values({
          syndicatId,
          nom: body.nom,
          sigle: body.sigle || null,
          logoUrl: body.logoUrl || null,
          login: body.login || null,
          pinCode: body.pinCode || null,
        }).returning();
        return res.status(201).json(toApi(created));
      } catch (err) {
        if (err.code === "23505") {
          return res.status(400).json({ error: "Ce numéro de téléphone (login) est déjà utilisé." });
        }
        console.error("POST /api/gares-routieres:", err);
        return res.status(500).json({ error: "Erreur lors de l'enregistrement." });
      }
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  async function assertOwnership() {
    if (auth.role === "admin") return true;
    if (auth.role !== "syndicat") {
      res.status(403).json({ error: "Modification réservée à l'admin général ou au syndicat propriétaire." });
      return false;
    }
    const [g] = await db.select().from(garesRoutieres).where(eq(garesRoutieres.id, id));
    if (!g) { res.status(404).json({ error: "Gare routière introuvable" }); return false; }
    if (g.syndicatId !== auth.syndicatId) { res.status(403).json({ error: "Cette gare routière n'appartient pas à votre syndicat." }); return false; }
    return true;
  }

  if (req.method === "PATCH") {
    if (!(await assertOwnership())) return;
    const body = req.body || {};
    if (body.pinCode && !/^\d{4}$/.test(body.pinCode)) {
      return res.status(400).json({ error: "Le code PIN doit comporter exactement 4 chiffres" });
    }
    const patch = {};
    ["nom", "sigle", "logoUrl", "login"].forEach((k) => {
      if (k in body) patch[k] = body[k] || null;
    });
    if (body.pinCode) patch.pinCode = body.pinCode;
    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }
    const [updated] = await db.update(garesRoutieres).set(patch).where(eq(garesRoutieres.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Gare routière introuvable" });
    return res.status(200).json(toApi(updated));
  }

  if (req.method === "DELETE") {
    if (!(await assertOwnership())) return;
    const used = await db.select().from(affectations).where(eq(affectations.gareRoutiereId, id));
    if (used.some((a) => a.actif)) {
      return res.status(400).json({ error: "Impossible de supprimer : des véhicules sont actuellement affectés à cette gare routière." });
    }
    const [deleted] = await db.delete(garesRoutieres).where(eq(garesRoutieres.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Gare routière introuvable" });
    return res.status(200).json({ deleted: true });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
