import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { garesRoutieres, affectations, lignes, elements } from "../db/schema.js";
import { requireAuth , estAdministrateur } from "../lib/auth.js";

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
      // Une gare rattache DEUX collectifs (transporteurs + chauffeurs) : sa
      // creation revient donc a l'administrateur, a la commission mixte, ou
      // a un syndicat (qui fournit alors le second collectif lui-meme).
      if (!estAdministrateur(auth) && auth.role !== "syndicat" && auth.role !== "commission_mixte") {
        return res.status(403).json({ error: "Réservé à l'administrateur général, à une commission mixte ou à un collectif." });
      }
      const body = req.body || {};
      const syndicatId = auth.role === "syndicat" ? auth.syndicatId : body.syndicatId;
      if (!body.nom || !syndicatId) {
        return res.status(400).json({ error: "Le nom de la gare et le collectif des transporteurs sont requis" });
      }
      if (body.pinCode && !/^\d{4}$/.test(body.pinCode)) {
        return res.status(400).json({ error: "Le code PIN doit comporter exactement 4 chiffres" });
      }
      try {
        const [created] = await db.insert(garesRoutieres).values({
          syndicatId,
          syndicatChauffeursId: body.syndicatChauffeursId || null,
          commissionMixteId: body.commissionMixteId || null,
          commune: body.commune || null,
          quartier: body.quartier || null,
          responsableNom: body.responsableNom || null,
          responsableContact: body.responsableContact || null,
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

  async function assertOwnership(allowSelfGare) {
    if (auth.role === "admin") return true;
    if (allowSelfGare && auth.role === "gare" && auth.gareRoutiereId === id) return true;
    if (auth.role !== "syndicat") {
      res.status(403).json({ error: "Modification réservée à l'admin général, au syndicat propriétaire, ou à la gare pour son propre profil." });
      return false;
    }
    const [g] = await db.select().from(garesRoutieres).where(eq(garesRoutieres.id, id));
    if (!g) { res.status(404).json({ error: "Gare routière introuvable" }); return false; }
    if (g.syndicatId !== auth.syndicatId) { res.status(403).json({ error: "Cette gare routière n'appartient pas à votre syndicat." }); return false; }
    return true;
  }

  if (req.method === "PATCH") {
    if (!(await assertOwnership(true))) return;
    const body = req.body || {};
    if (body.pinCode && !/^\d{4}$/.test(body.pinCode)) {
      return res.status(400).json({ error: "Le code PIN doit comporter exactement 4 chiffres" });
    }
    const patch = {};
    ["nom", "sigle", "logoUrl", "login", "syndicatChauffeursId", "commissionMixteId", "commune", "quartier", "responsableNom", "responsableContact"].forEach((k) => {
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
    // Les lignes portent une cle etrangere vers la gare : les oublier
    // faisait echouer la suppression avec une erreur serveur brute.
    const lignesLiees = await db.select().from(lignes).where(eq(lignes.gareRoutiereId, id));
    if (lignesLiees.length > 0) {
      return res.status(400).json({ error: `Impossible de supprimer : ${lignesLiees.length} ligne(s) sont rattachée(s) à cette gare routière. Supprimez-les d'abord.` });
    }
    const elementsLies = await db.select().from(elements).where(eq(elements.gareRoutiereId, id));
    if (elementsLies.length > 0) {
      return res.status(400).json({ error: `Impossible de supprimer : ${elementsLies.length} élément(s) y sont rattaché(s).` });
    }
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
