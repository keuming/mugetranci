import { eq } from "drizzle-orm";
import { db } from "../db/index.js";

/* ============================================================
   IMPRESSION DES CARTES — compte imprimeur mensuel
   - L'imprimeur se connecte avec la période du mois en cours comme
     identifiant (MMAAAA : 102026 en octobre 2026) et le code créé par
     l'administrateur pour ce mois. L'accès expire à la fin du mois.
   - Il ne voit QUE les nouvelles cartes envoyées à l'impression par un
     collectif, une association ou l'administrateur, et ne peut que les
     marquer « imprimées ». Elles passent alors aux archives (duplicata).
   - Chaque carte imprimée garde sa date et son lot d'impression (MMAAAA) ;
     elle est valable 2 ans à compter de sa date d'impression.
   ============================================================ */

// Période MMAAAA (heure d'Abidjan = UTC)
export function periodeCourante(d = new Date()) {
  return String(d.getUTCMonth() + 1).padStart(2, "0") + d.getUTCFullYear();
}
export function finDuMois(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - 1000);
}

// Champs d'impression à appliquer lors d'un PATCH « classique »
// (administrateur, collectif, association, agent).
export function champsImpression(body, auth, avant) {
  const patch = {};
  if ("carteImprimee" in body) {
    if (body.carteImprimee) {
      patch.carteImprimee = true;
      // Date et lot fixés à la PREMIÈRE impression (un duplicata ne les change pas)
      patch.carteImprimeeAt = avant?.carteImprimee && avant?.carteImprimeeAt ? avant.carteImprimeeAt : new Date();
      patch.lotImpression = avant?.carteImprimee && avant?.lotImpression ? avant.lotImpression : periodeCourante();
      patch.pretImpression = false;
    } else {
      // Retour dans les nouvelles cartes : la prochaine impression refixera date et lot
      patch.carteImprimee = false;
      patch.carteImprimeeAt = null;
      patch.lotImpression = null;
    }
  }
  if ("pretImpression" in body) {
    patch.pretImpression = !!body.pretImpression;
    patch.pretImpressionAt = body.pretImpression ? new Date() : null;
    patch.pretImpressionPar = body.pretImpression ? String(auth?.nom || auth?.role || "").slice(0, 160) || null : null;
  }
  return patch;
}

/* Requêtes d'un imprimeur sur une API de cartes : seul le marquage
   « imprimée » d'une carte qui lui a été envoyée est autorisé. */
export async function gererImprimeur(req, res, auth, table, toApi) {
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const body = req.body || {};
  if (req.method !== "PATCH" || !id || Object.keys(body).join(",") !== "carteImprimee" || body.carteImprimee !== true) {
    return res.status(403).json({ error: "Compte imprimeur : seule la confirmation d'impression des cartes est autorisée." });
  }
  const [carte] = await db.select().from(table).where(eq(table.id, id));
  if (!carte) return res.status(404).json({ error: "Carte introuvable." });
  if (!carte.pretImpression || carte.carteImprimee) {
    return res.status(409).json({ error: "Cette carte n'est pas (ou plus) dans la liste à imprimer." });
  }
  const [maj] = await db.update(table)
    .set({ carteImprimee: true, carteImprimeeAt: new Date(), lotImpression: auth.periode, pretImpression: false })
    .where(eq(table.id, id)).returning();
  return res.status(200).json(toApi(maj));
}

/* Marquage « à imprimer » par un collectif, une association ou une
   commission mixte : autorisé pour toute carte de SON périmètre, même si
   elle a été enregistrée par quelqu'un d'autre. Seul le champ
   pretImpression est accepté par ce chemin ; renvoie true si la requête a
   été traitée ici. */
export async function gererMarquageImpression(req, res, auth, table, toApi) {
  const roles = ["association", "syndicat", "commission_mixte"];
  const body = req.body || {};
  if (req.method !== "PATCH" || !roles.includes(auth.role) || Object.keys(body).join(",") !== "pretImpression") return false;
  const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const [carte] = id ? await db.select().from(table).where(eq(table.id, id)) : [];
  if (!carte) { res.status(404).json({ error: "Carte introuvable." }); return true; }
  const dansPerimetre =
    (auth.role === "association" && carte.associationId && carte.associationId === auth.associationId) ||
    (auth.role === "syndicat" && carte.syndicatId && carte.syndicatId === auth.syndicatId) ||
    (auth.role === "commission_mixte" && carte.commissionMixteId && carte.commissionMixteId === auth.commissionMixteId);
  if (!dansPerimetre) { res.status(403).json({ error: "Cette carte n'appartient pas à votre collectif / association." }); return true; }
  if (carte.carteImprimee && body.pretImpression) { res.status(409).json({ error: "Carte déjà imprimée : réimpression en duplicata depuis les archives." }); return true; }
  const [maj] = await db.update(table).set(champsImpression(body, auth, carte)).where(eq(table.id, id)).returning();
  res.status(200).json(toApi(maj));
  return true;
}
