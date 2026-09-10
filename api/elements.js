import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { elements, syndicats, garesRoutieres } from "../db/schema.js";
import { requireAuth } from "../lib/auth.js";
import { genererNumeroCarte } from "../lib/cards.js";

function toApi(row) {
  const { photoUrl, qrPaiementUrl, ...rest } = row;
  return { ...rest, photo: photoUrl, qrPaiement: qrPaiementUrl };
}
function toDb(body) {
  const { photo, qrPaiement, numeroCarte, ...rest } = body;
  return { ...rest, photoUrl: photo ?? null, qrPaiementUrl: qrPaiement ?? null };
}

export default async function handler(req, res) {
  const idParam = req.query.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const auth = requireAuth(req, res);
  if (!auth) return;

  if (!id) {
    if (req.method === "GET") {
      let rows = await db.select().from(elements);
      if (auth.role === "syndicat") {
        rows = rows.filter((e) => e.syndicatId === auth.syndicatId);
      } else if (auth.role === "commission_mixte") {
        const mySyndicats = await db.select().from(syndicats).where(eq(syndicats.commissionMixteId, auth.commissionMixteId));
        const mySyndicatIds = new Set(mySyndicats.map((s) => s.id));
        rows = rows.filter((e) => mySyndicatIds.has(e.syndicatId) || (e.creatorType === "commission_mixte" && e.creatorId === auth.commissionMixteId));
      } else if (auth.role === "gare") {
        rows = rows.filter((e) => e.creatorType === "gare" && e.creatorId === auth.gareRoutiereId);
      }
      return res.status(200).json(rows.map(toApi));
    }

    if (req.method === "POST") {
      const body = req.body || {};
      if (!body.nom || !body.prenoms || !body.cni) {
        return res.status(400).json({ error: "nom, prenoms et cni sont requis" });
      }
      const values = toDb(body);
      values.numeroCarte = await genererNumeroCarte(elements, "E");
      if ("logo1Type" in body) { values.logo1Type = body.logo1Type || null; values.logo1Id = body.logo1Id || null; }
      if ("logo2Type" in body) { values.logo2Type = body.logo2Type || null; values.logo2Id = body.logo2Id || null; }

      if (auth.role === "syndicat") {
        values.syndicatId = auth.syndicatId;
        values.creatorType = "syndicat";
        values.creatorId = auth.syndicatId;
      } else if (auth.role === "commission_mixte") {
        values.creatorType = "commission_mixte";
        values.creatorId = auth.commissionMixteId;
      } else if (auth.role === "gare") {
        values.creatorType = "gare";
        values.creatorId = auth.gareRoutiereId;
        const [gare] = await db.select().from(garesRoutieres).where(eq(garesRoutieres.id, auth.gareRoutiereId));
        if (gare) values.syndicatId = gare.syndicatId;
      } else {
        values.creatorType = "admin";
      }

      const [created] = await db.insert(elements).values(values).returning();
      return res.status(201).json(toApi(created));
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  async function assertOwnership() {
    if (auth.role === "admin") return true;
    const [e] = await db.select().from(elements).where(eq(elements.id, id));
    if (!e) { res.status(404).json({ error: "Élément introuvable" }); return false; }
    if (auth.role === "commission_mixte") {
      if (e.creatorType === "commission_mixte" && e.creatorId === auth.commissionMixteId) return true;
      res.status(403).json({ error: "Vous ne pouvez modifier que les éléments créés par votre commission." });
      return false;
    }
    if (auth.role === "gare") {
      if (e.creatorType === "gare" && e.creatorId === auth.gareRoutiereId) return true;
      res.status(403).json({ error: "Vous ne pouvez modifier que les éléments créés par votre gare." });
      return false;
    }
    if (auth.role === "syndicat" && e.syndicatId === auth.syndicatId) return true;
    res.status(403).json({ error: "Cet élément n'appartient pas à votre syndicat." });
    return false;
  }

  if (req.method === "PATCH") {
    if (!(await assertOwnership())) return;

    const body = req.body || {};
    const patch = {};
    if ("photo" in body) patch.photoUrl = body.photo;
    if ("qrPaiement" in body) patch.qrPaiementUrl = body.qrPaiement;
    if ("nom" in body) patch.nom = body.nom;
    if ("prenoms" in body) patch.prenoms = body.prenoms;
    if ("fonction" in body) patch.fonction = body.fonction;
    if ("contact1" in body) patch.contact1 = body.contact1;
    if ("contact2" in body) patch.contact2 = body.contact2;
    if ("contact3" in body) patch.contact3 = body.contact3;
    if ("email" in body) patch.email = body.email;
    if ("logo1Type" in body) { patch.logo1Type = body.logo1Type || null; patch.logo1Id = body.logo1Id || null; }
    if ("logo2Type" in body) { patch.logo2Type = body.logo2Type || null; patch.logo2Id = body.logo2Id || null; }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }

    const [updated] = await db.update(elements).set(patch).where(eq(elements.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Élément introuvable" });
    return res.status(200).json(toApi(updated));
  }

  if (req.method === "DELETE") {
    if (!(await assertOwnership())) return;
    const [deleted] = await db.delete(elements).where(eq(elements.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Élément introuvable" });
    return res.status(200).json({ deleted: true });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
