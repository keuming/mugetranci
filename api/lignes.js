import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { lignes, affectations } from "../db/schema.js";
import { requireAuth } from "../lib/auth.js";

export default async function handler(req, res) {
  const idParam = req.query.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const auth = requireAuth(req, res);
  if (!auth) return;

  if (!id) {
    if (req.method === "GET") {
      let rows = await db.select().from(lignes);
      if (auth.role === "commission_mixte") {
        rows = rows.filter((l) => l.commissionMixteId === auth.commissionMixteId);
      }
      // Un syndicat voit toutes les lignes (pour affecter ses véhicules à
      // n'importe quelle commission), pas seulement celles de "sa" commission.
      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      if (auth.role === "syndicat") {
        return res.status(403).json({ error: "La création de ligne est réservée à l'admin et aux commissions mixtes." });
      }
      const body = req.body || {};
      const commissionMixteId = auth.role === "commission_mixte" ? auth.commissionMixteId : body.commissionMixteId;
      if (!commissionMixteId || !body.lieuDepart || !body.lieuArrivee || !body.cout) {
        return res.status(400).json({ error: "commissionMixteId, lieuDepart, lieuArrivee et cout sont requis" });
      }
      const [created] = await db.insert(lignes).values({
        commissionMixteId,
        lieuDepart: body.lieuDepart,
        lieuArrivee: body.lieuArrivee,
        cout: Math.round(Number(body.cout)),
        chefNom: body.chefNom || null,
        chefContact: body.chefContact || null,
      }).returning();
      return res.status(201).json(created);
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  async function assertOwnership() {
    if (auth.role === "admin") return true;
    if (auth.role !== "commission_mixte") {
      res.status(403).json({ error: "Modification réservée à l'admin et aux commissions mixtes." });
      return false;
    }
    const [l] = await db.select().from(lignes).where(eq(lignes.id, id));
    if (!l) { res.status(404).json({ error: "Ligne introuvable" }); return false; }
    if (l.commissionMixteId !== auth.commissionMixteId) { res.status(403).json({ error: "Cette ligne n'appartient pas à votre commission mixte." }); return false; }
    return true;
  }

  if (req.method === "PATCH") {
    if (!(await assertOwnership())) return;

    const body = req.body || {};
    const patch = {};
    if ("lieuDepart" in body) patch.lieuDepart = body.lieuDepart;
    if ("lieuArrivee" in body) patch.lieuArrivee = body.lieuArrivee;
    if ("cout" in body) patch.cout = Math.round(Number(body.cout));
    if ("chefNom" in body) patch.chefNom = body.chefNom || null;
    if ("chefContact" in body) patch.chefContact = body.chefContact || null;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }

    const [updated] = await db.update(lignes).set(patch).where(eq(lignes.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Ligne introuvable" });
    return res.status(200).json(updated);
  }

  if (req.method === "DELETE") {
    if (!(await assertOwnership())) return;
    const activeAffectations = await db.select().from(affectations).where(eq(affectations.ligneId, id));
    const stillActive = activeAffectations.filter((a) => a.actif);
    if (stillActive.length > 0) {
      return res.status(400).json({ error: `Impossible de supprimer cette ligne : ${stillActive.length} véhicule(s) y sont actuellement affecté(s). Désaffectez-les d'abord.` });
    }
    const [deleted] = await db.delete(lignes).where(eq(lignes.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Ligne introuvable" });
    return res.status(200).json({ deleted: true });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
