import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { proprietaires, syndicats, garesRoutieres, vehicules, historiqueProprietaires } from "../db/schema.js";
import { requireAuth } from "../lib/auth.js";
import { genererNumeroCarte } from "../lib/cards.js";

function toApi(row) {
  const { photoUrl, qrPaiementUrl, ...rest } = row;
  return { ...rest, photo: photoUrl, qrPaiement: qrPaiementUrl };
}
function toDb(body) {
  const { photo, qrPaiement, carteTransporteurNumero, ...rest } = body; // le numéro de carte est généré côté serveur, jamais fourni par le client
  return { ...rest, photoUrl: photo ?? null, qrPaiementUrl: qrPaiement ?? null };
}

export default async function handler(req, res) {
  const idParam = req.query.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
  const auth = requireAuth(req, res);
  if (!auth) return;

  if (!id) {
    if (req.method === "GET") {
      let rows = await db.select().from(proprietaires);
      if (auth.role === "syndicat") {
        rows = rows.filter((p) => p.syndicatId === auth.syndicatId);
      } else if (auth.role === "commission_mixte") {
        // Vue agrégée : membres de tous les syndicats de cette commission,
        // + les transporteurs créés directement par la commission elle-même.
        const mySyndicats = await db.select().from(syndicats).where(eq(syndicats.commissionMixteId, auth.commissionMixteId));
        const mySyndicatIds = new Set(mySyndicats.map((s) => s.id));
        rows = rows.filter((p) => mySyndicatIds.has(p.syndicatId) || (p.creatorType === "commission_mixte" && p.creatorId === auth.commissionMixteId));
      } else if (auth.role === "gare") {
        rows = rows.filter((p) => p.creatorType === "gare" && p.creatorId === auth.gareRoutiereId);
      }
      return res.status(200).json(rows.map(toApi));
    }

    if (req.method === "POST") {
      const body = req.body || {};
      if (!body.nom || !body.prenoms || !body.cni) {
        return res.status(400).json({ error: "nom, prenoms et cni sont requis" });
      }
      const values = toDb(body);
      values.carteTransporteurNumero = await genererNumeroCarte(proprietaires, "T");
      if ("logo1Type" in body) { values.logo1Type = body.logo1Type || null; values.logo1Id = body.logo1Id || null; }
      if ("logo2Type" in body) { values.logo2Type = body.logo2Type || null; values.logo2Id = body.logo2Id || null; }

      // Traçabilité du créateur — déterminera l'entête affiché sur la fiche.
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
        if (gare) values.syndicatId = gare.syndicatId; // compte aussi dans les effectifs du syndicat parent
      } else if (auth.role === "agent") {
        // Un agent enrôleur agit au nom de son entité de rattachement.
        values.creatorType = auth.parentType;
        values.creatorId = auth.parentId;
        if (auth.parentType === "syndicat") values.syndicatId = auth.parentId;
      } else {
        values.creatorType = "admin";
      }

      const [created] = await db.insert(proprietaires).values(values).returning();
      return res.status(201).json(toApi(created));
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  async function assertOwnership() {
    if (auth.role === "admin") return true;
    const [p] = await db.select().from(proprietaires).where(eq(proprietaires.id, id));
    if (!p) { res.status(404).json({ error: "Membre introuvable" }); return false; }
    if (auth.role === "commission_mixte") {
      if (p.creatorType === "commission_mixte" && p.creatorId === auth.commissionMixteId) return true;
      res.status(403).json({ error: "Vous ne pouvez modifier que les transporteurs créés par votre commission." });
      return false;
    }
    if (auth.role === "gare") {
      if (p.creatorType === "gare" && p.creatorId === auth.gareRoutiereId) return true;
      res.status(403).json({ error: "Vous ne pouvez modifier que les transporteurs créés par votre gare." });
      return false;
    }
    if (auth.role === "syndicat") {
      if (p.syndicatId === auth.syndicatId) return true;
    }
    res.status(403).json({ error: "Ce membre n'appartient pas à votre syndicat." });
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
    if ("numeroPermis" in body) patch.numeroPermis = body.numeroPermis;
    if ("contact1" in body) patch.contact1 = body.contact1;
    if ("contact2" in body) patch.contact2 = body.contact2;
    if ("contact3" in body) patch.contact3 = body.contact3;
    if ("email" in body) patch.email = body.email;
    if ("ville" in body) patch.ville = body.ville;
    if ("quartier" in body) patch.quartier = body.quartier;
    if ("logo1Type" in body) { patch.logo1Type = body.logo1Type || null; patch.logo1Id = body.logo1Id || null; }
    if ("logo2Type" in body) { patch.logo2Type = body.logo2Type || null; patch.logo2Id = body.logo2Id || null; }
    // carteTransporteurNumero n'est jamais modifiable manuellement.

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }

    const [updated] = await db.update(proprietaires).set(patch).where(eq(proprietaires.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Membre introuvable" });
    return res.status(200).json(toApi(updated));
  }

  if (req.method === "DELETE") {
    if (!(await assertOwnership())) return;
    const [vehiculesLies, historique] = await Promise.all([
      db.select().from(vehicules).where(eq(vehicules.proprietaireId, id)),
      db.select().from(historiqueProprietaires).where(eq(historiqueProprietaires.proprietaireId, id)),
    ]);
    if (vehiculesLies.length > 0 || historique.length > 0) {
      return res.status(400).json({ error: "Impossible de supprimer ce transporteur : il a un ou plusieurs véhicules rattachés (actuellement ou dans l'historique)." });
    }
    const [deleted] = await db.delete(proprietaires).where(eq(proprietaires.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Membre introuvable" });
    return res.status(200).json({ deleted: true });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
