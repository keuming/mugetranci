import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { syndicats, proprietaires, associations, garesRoutieres, chauffeurs, elements, vehicules } from "../db/schema.js";
import { requireAuth , estAdministrateur } from "../lib/auth.js";

// Couleur au format #RRGGBB, sinon null.
function couleur(v) {
  const t = String(v || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(t) ? t.toUpperCase() : null;
}

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
      return res.status(200).json(rows.map(({ pinCode, ...r }) => ({ ...r, pinConfigure: !!pinCode })));
    }
    if (req.method === "POST") {
      if (!estAdministrateur(auth) && auth.role !== "commission_mixte" && auth.role !== "syndicat") {
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
        cachetUrl: body.cachetUrl || null,
        signatureUrl: body.signatureUrl || null,
        presidentNom: body.presidentNom || null,
        presidentContact: body.presidentContact || null,
        login: body.login || null,
        pinCode: body.pinCode || null,
      }).returning();
      const { pinCode: _p, ...sansPin } = created;
      return res.status(201).json({ ...sansPin, pinConfigure: !!created.pinCode });
    }
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const [existing] = await db.select().from(associations).where(eq(associations.id, id));
  if (!existing) return res.status(404).json({ error: "Association introuvable" });
  if (auth.role === "syndicat" && existing.syndicatId !== auth.syndicatId) {
    return res.status(403).json({ error: "Cette association n'appartient pas à votre collectif." });
  }
  if (!estAdministrateur(auth) && auth.role !== "commission_mixte" && auth.role !== "syndicat") {
    return res.status(403).json({ error: "Modification non autorisée." });
  }

  if (req.method === "PATCH") {
    const body = req.body || {};
    const patch = {};
    ["nom", "sigle", "logoUrl", "cachetUrl", "signatureUrl", "presidentNom", "presidentContact", "login"].forEach((k) => {
      if (k in body) patch[k] = body[k] || null;
    });
    if ("pinCode" in body && body.pinCode) {
      if (!/^\d{4}$/.test(body.pinCode)) {
        return res.status(400).json({ error: "Le code PIN doit comporter exactement 4 chiffres" });
      }
      patch.pinCode = body.pinCode;
    }
    if (Object.keys(patch).length === 0) return res.status(400).json({ error: "Aucun champ à mettre à jour" });
    const [updated] = await db.update(associations).set(patch).where(eq(associations.id, id)).returning();
    const { pinCode: _pp, ...sansPin } = updated;
    return res.status(200).json({ ...sansPin, pinConfigure: !!updated.pinCode });
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
      // Compagnie indépendante (VTC…) : créée par l'administrateur général
      // uniquement, sans commune ni commission mixte.
      if (body.compagnie) {
        if (auth.role !== "admin") return res.status(403).json({ error: "Seul l'administrateur général crée une compagnie." });
        if (!body.nom) return res.status(400).json({ error: "Le nom de la compagnie est requis." });
        if (body.pinCode && !/^\d{4}$/.test(body.pinCode)) return res.status(400).json({ error: "Le code PIN doit comporter exactement 4 chiffres" });
        try {
          const [created] = await db.insert(syndicats).values({
            commissionMixteId: null,
            compagnie: true,
            nom: body.nom,
            sigle: body.sigle || null,
            logoUrl: body.logoUrl || null,
            nature: String(body.nature || "Compagnie de transport").trim().slice(0, 60) || "Compagnie de transport",
            couleurPrimaire: couleur(body.couleurPrimaire) || "#0B6E4F",
            couleurSecondaire: couleur(body.couleurSecondaire) || "#E07A1F",
            cachetUrl: body.cachetUrl || null,
            signatureUrl: body.signatureUrl || null,
            faitiereLogoUrl: body.faitiereLogoUrl || null,
            faitiereNom: String(body.faitiereNom || "").trim().slice(0, 160) || null,
            modeleCarte: body.modeleCarte === "officiel" ? "officiel" : "moderne",
            presidentNom: body.presidentNom || null,
            presidentContact: body.presidentContact || null,
            login: body.login || null,
            pinCode: body.pinCode || null,
          }).returning();
          return res.status(201).json(toApi(created));
        } catch (err) {
          if (err.code === "23505") return res.status(400).json({ error: "Ce numéro de téléphone (login) est déjà utilisé." });
          console.error("POST /api/syndicats (compagnie):", err);
          return res.status(500).json({ error: "Erreur lors de l'enregistrement." });
        }
      }
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
      // Une commune ne compte que DEUX collectifs : celui des transporteurs
      // et celui des conducteurs. Toute autre structure est une association,
      // a creer sous l'un de ces deux collectifs. Sans ce garde-fou, des
      // associations finissaient enregistrees comme collectifs et polluaient
      // le menu deroulant du logo de gauche.
      // La règle « deux collectifs par commune » ne vaut que pour les
      // collectifs : une compagnie de transport ou un autre groupement peut
      // coexister avec eux dans la même commune.
      const natureGroupement = String(body.nature || "Collectif").trim().slice(0, 60) || "Collectif";
      if (body.commune && body.type && natureGroupement.toLowerCase() === "collectif") {
        const existants = await db.select().from(syndicats);
        const doublon = existants.find(
          (s) => (s.commune || "").trim().toUpperCase() === body.commune.trim().toUpperCase()
            && s.type === body.type && String(s.nature || "Collectif").toLowerCase() === "collectif"
        );
        if (doublon) {
          const libelle = body.type === "transporteurs" ? "des transporteurs" : "des conducteurs";
          return res.status(400).json({
            error: `Le collectif ${libelle} de ${body.commune} existe déjà (${doublon.sigle || doublon.nom}). Chaque commune n'en compte que deux. Si vous enregistrez une mutuelle ou un syndicat de base, créez-le comme association sous ce collectif.`,
          });
        }
      }

      try {
        const [created] = await db.insert(syndicats).values({
          commissionMixteId,
          nom: body.nom,
          sigle: body.sigle || null,
          logoUrl: body.logoUrl || null,
          cachetUrl: body.cachetUrl || null,
          signatureUrl: body.signatureUrl || null,
          commune: body.commune || null,
          type: body.type || null,
          nature: natureGroupement,
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
    // Le profil (identifiants compris) d'une compagnie n'est modifiable que par
    // son compte titulaire, pas par ses agents.
    if (allowSelfSyndicat && auth.role === "syndicat" && auth.syndicatId === id && !auth.agentId) return true;
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
    ["nom", "sigle", "logoUrl", "cachetUrl", "signatureUrl", "commune", "type", "presidentNom", "presidentContact", "login"].forEach((k) => {
      if (k in body) patch[k] = body[k] || null;
    });
    if (body.pinCode) patch.pinCode = body.pinCode;
    if ("nature" in body) patch.nature = String(body.nature || "Collectif").trim().slice(0, 60) || "Collectif";
    // Identité visuelle d'une compagnie : gérée depuis le back-office général.
    if (auth.role === "admin") {
      if ("couleurPrimaire" in body) patch.couleurPrimaire = couleur(body.couleurPrimaire);
      if ("couleurSecondaire" in body) patch.couleurSecondaire = couleur(body.couleurSecondaire);
      if ("faitiereLogoUrl" in body) patch.faitiereLogoUrl = body.faitiereLogoUrl || null;
      if ("faitiereNom" in body) patch.faitiereNom = String(body.faitiereNom || "").trim().slice(0, 160) || null;
      if ("modeleCarte" in body) patch.modeleCarte = body.modeleCarte === "officiel" ? "officiel" : "moderne";
    } else if (auth.role === "syndicat") {
      // Le compte d'une compagnie ne modifie ni son logo, ni sa nature, ni son nom.
      const [moi] = await db.select().from(syndicats).where(eq(syndicats.id, id));
      if (moi?.compagnie) { delete patch.logoUrl; delete patch.cachetUrl; delete patch.signatureUrl; delete patch.nature; delete patch.nom; delete patch.sigle; delete patch.commune; delete patch.type; }
    }

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
    // Controle d'integrite complet : associations et gares routieres ont une
    // contrainte de cle etrangere, leur oubli faisait echouer la suppression
    // avec une erreur serveur brute au lieu d'un message comprehensible.
    const [assos, gares, members, drivers, els, vehs] = await Promise.all([
      db.select().from(associations).where(eq(associations.syndicatId, id)),
      db.select().from(garesRoutieres).where(eq(garesRoutieres.syndicatId, id)),
      db.select().from(proprietaires).where(eq(proprietaires.syndicatId, id)),
      db.select().from(chauffeurs).where(eq(chauffeurs.syndicatId, id)),
      db.select().from(elements).where(eq(elements.syndicatId, id)),
      db.select().from(vehicules).where(eq(vehicules.syndicatId, id)),
    ]);
    const blocages = [
      [assos.length, "association(s)"],
      [gares.length, "gare(s) routière(s)"],
      [members.length, "transporteur(s)"],
      [drivers.length, "chauffeur(s)"],
      [els.length, "élément(s)"],
      [vehs.length, "véhicule(s)"],
    ].filter(([n]) => n > 0).map(([n, lab]) => `${n} ${lab}`);
    if (blocages.length > 0) {
      return res.status(400).json({
        error: `Impossible de supprimer ce collectif : ${blocages.join(", ")} y sont rattachés. Supprimez-les ou rattachez-les ailleurs d'abord.`,
      });
    }
    const [deleted] = await db.delete(syndicats).where(eq(syndicats.id, id)).returning();
    if (!deleted) return res.status(404).json({ error: "Syndicat introuvable" });
    return res.status(200).json({ deleted: true });
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
