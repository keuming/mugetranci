import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { elements, syndicats, garesRoutieres, associations, commissionsMixtes, lignes } from "../db/schema.js";
import { requireAuth, agentPeutGerer } from "../lib/auth.js";
import { genererNumeroCarte } from "../lib/cards.js";
import { chercherDoublon } from "../lib/doublons.js";
import { lierCompteOrzayah, traiterPatchOrzayah, retirerChampsOrzayahServeur, normaliserCodeOrzayah, normaliserTelephone } from "../lib/orzayah.js";

function toApi(row) {
  const { photoUrl, qrPaiementUrl, ...rest } = row;
  return { ...rest, photo: photoUrl, qrPaiement: qrPaiementUrl };
}
function toDb(body) {
  const { photo, qrPaiement, numeroCarte, ...rest } = body;
  return retirerChampsOrzayahServeur({ ...rest, photoUrl: photo ?? null, qrPaiementUrl: qrPaiement ?? null, commissionMixteId: rest.commissionMixteId || null, commune: rest.commune || null, associationId: rest.associationId || null });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Fiche Numerique d'Identification de l'Administrateur (FNIA) : contenu du
   QR code de la carte "element". Volontairement SANS authentification --
   n'importe qui peut se presenter comme agent administratif aupres d'un
   chauffeur ; le but explicite de cette fiche est de permettre a quiconque
   de verifier sur-le-champ, en scannant la carte, que la personne occupe
   reellement le poste qu'elle revendique, pour quel collectif, quelle
   gare et quelle ligne. Aucun code PIN, aucun identifiant de connexion. */
async function handleFniaPublique(req, res, elementId) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  if (!elementId || !UUID_RE.test(elementId)) {
    return res.status(400).json({ error: "Adresse de fiche invalide : ce lien ne correspond à aucun dossier." });
  }
  let e;
  try {
    [e] = await db.select().from(elements).where(eq(elements.id, elementId));
  } catch (err) {
    console.error("GET fnia-publique:", err);
    return res.status(400).json({ error: "Adresse de fiche invalide." });
  }
  if (!e) return res.status(404).json({ error: "Dossier introuvable." });

  const [collectif] = e.syndicatId ? await db.select().from(syndicats).where(eq(syndicats.id, e.syndicatId)) : [null];
  const [assoc] = e.associationId ? await db.select().from(associations).where(eq(associations.id, e.associationId)) : [null];
  const [commission] = e.commissionMixteId ? await db.select().from(commissionsMixtes).where(eq(commissionsMixtes.id, e.commissionMixteId)) : [null];
  const [gare] = e.gareRoutiereId ? await db.select().from(garesRoutieres).where(eq(garesRoutieres.id, e.gareRoutiereId)) : [null];
  const [ligne] = e.ligneId ? await db.select().from(lignes).where(eq(lignes.id, e.ligneId)) : [null];

  return res.status(200).json({
    agent: {
      nom: e.nom, prenoms: e.prenoms, photoUrl: e.photoUrl,
      numeroCarte: e.numeroCarte, fonction: e.fonction, commune: e.commune,
      contact1: e.contact1,
    },
    collectif: collectif ? { nom: collectif.nom, sigle: collectif.sigle, type: collectif.type, commune: collectif.commune } : null,
    association: assoc ? { nom: assoc.nom, sigle: assoc.sigle } : null,
    commissionMixte: commission ? { nom: commission.nom, sigle: commission.sigle, commune: commission.commune } : null,
    gare: gare ? {
      nom: gare.nom, commune: gare.commune, quartier: gare.quartier,
      chefGareNom: gare.responsableNom, chefGareContact: gare.responsableContact,
    } : null,
    ligne: ligne ? {
      trajet: `${ligne.lieuDepart} — ${ligne.lieuArrivee}`,
      chefLigneNom: ligne.chefNom, chefLigneContact: ligne.chefContact,
    } : null,
  });
}

export default async function handler(req, res) {
  const idParam = req.query.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  if (req.query.resource === "fnia-publique") {
    return handleFniaPublique(req, res, id);
  }

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
      if ("gareRoutiereId" in body) values.gareRoutiereId = body.gareRoutiereId || null;
      if ("ligneId" in body) values.ligneId = body.ligneId || null;
      // Un élément est l'agent administratif d'UNE association précise —
      // rattachement explicite quand le créateur n'en implique pas déjà un.
      if (body.syndicatId) values.syndicatId = body.syndicatId;

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
      } else if (auth.role === "agent") {
        values.creatorType = auth.parentType;
        values.creatorId = auth.parentId;
        if (auth.parentType === "syndicat") values.syndicatId = auth.parentId;
      } else {
        values.creatorType = "admin";
      }
      if (!values.syndicatId) {
        return res.status(400).json({ error: "L'association (collectif/syndicat) de rattachement de l'élément est requise." });
      }

      try {
        // Anti-doublons : CNI, permis, téléphone, compte ORZAYAH — AVANT l'enregistrement.
        const doublon = await chercherDoublon("element", values);
        if (doublon) return res.status(409).json({ error: doublon });
        const [created] = await db.insert(elements).values(values).returning();
        // Fin du processus d'ajout : création du compte ORZAYAH + QR du verso.
        const final = await lierCompteOrzayah(elements, created);
        return res.status(201).json(toApi(final));
      } catch (err) {
        if (err.code === "23505") {
          return res.status(400).json({ error: "Un enregistrement identique existe déjà." });
        }
        console.error("POST api/elements.js:", err);
        return res.status(500).json({ error: "Erreur lors de l'enregistrement du élément." });
      }
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
    if (auth.role === "agent") {
      const ok = await agentPeutGerer(auth, e, async (cmId) => {
        const rows = await db.select().from(syndicats).where(eq(syndicats.commissionMixteId, cmId));
        return new Set(rows.map((s) => s.id));
      });
      if (ok) return true;
      res.status(403).json({ error: "Cet enregistrement est hors de votre périmètre." });
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
    if ("orzayahCompte" in body) patch.orzayahCompte = normaliserCodeOrzayah(body.orzayahCompte);
    if ("orzayahTelephone" in body) patch.orzayahTelephone = normaliserTelephone(body.orzayahTelephone) || null;
    if ("photo" in body) patch.photoUrl = body.photo;
    if ("qrPaiement" in body) patch.qrPaiementUrl = body.qrPaiement;
    if ("nom" in body) patch.nom = body.nom;
    if ("prenoms" in body) patch.prenoms = body.prenoms;
    if ("fonction" in body) patch.fonction = body.fonction;
    if ("syndicatId" in body && body.syndicatId) patch.syndicatId = body.syndicatId;
    if ("contact1" in body) patch.contact1 = body.contact1;
    if ("contact2" in body) patch.contact2 = body.contact2;
    if ("contact3" in body) patch.contact3 = body.contact3;
    if ("email" in body) patch.email = body.email;
    if ("logo1Type" in body) { patch.logo1Type = body.logo1Type || null; patch.logo1Id = body.logo1Id || null; }
    if ("logo2Type" in body) { patch.logo2Type = body.logo2Type || null; patch.logo2Id = body.logo2Id || null; }
    if ("commune" in body) patch.commune = body.commune || null;
    if ("associationId" in body) patch.associationId = body.associationId || null;
    if ("commissionMixteId" in body) patch.commissionMixteId = body.commissionMixteId || null;
    if ("carteImprimee" in body) {
      patch.carteImprimee = !!body.carteImprimee;
      patch.carteImprimeeAt = body.carteImprimee ? new Date() : null;
    }
    if ("gareRoutiereId" in body) patch.gareRoutiereId = body.gareRoutiereId || null;
    if ("ligneId" in body) patch.ligneId = body.ligneId || null;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    }

    try {
      const doublon = await chercherDoublon("element", patch, id);
      if (doublon) return res.status(409).json({ error: doublon });
      const [avant] = ("orzayahCompte" in patch || "orzayahTelephone" in patch) ? await db.select().from(elements).where(eq(elements.id, id)) : [null];
      let [updated] = await db.update(elements).set(patch).where(eq(elements.id, id)).returning();
      if (updated && ("orzayahCompte" in patch || "orzayahTelephone" in patch)) updated = await traiterPatchOrzayah(elements, avant, updated);
      if (!updated) return res.status(404).json({ error: "Élément introuvable" });
      return res.status(200).json(toApi(updated));
    } catch (err) {
      console.error("PATCH api/elements.js:", err);
      return res.status(500).json({ error: "Erreur lors de la mise à jour." });
    }
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
