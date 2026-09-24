import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { proprietaires, chauffeurs, elements } from "../db/schema.js";

/* ============================================================
   INTÉGRATION ORZAYAH — liaison carte / compte marchand
   À la création (ou à la correction) d'un membre portant un n° de
   compte ORZAYAH (code ORZ-XXXXXXXX pré-imprimé), le serveur appelle
   l'API ORZAYAH qui :
     - crée le compte marchand du membre (code secret par défaut 0000,
       à changer par le titulaire dans l'app ORZAYAH),
     - lie le code au téléphone du membre,
     - renvoie l'image PNG du QR (data URL), embarquée au verso de la carte.
   La clé d'API reste STRICTEMENT côté serveur (variable d'environnement
   Vercel ORZAYAH_API_KEY) : elle n'apparaît jamais dans le front.
   Un échec ORZAYAH ne bloque jamais l'enregistrement du membre : le
   statut passe à "erreur" avec le message, et une nouvelle sauvegarde
   de la fiche relance la liaison.
   ============================================================ */

const API_URL =
  process.env.ORZAYAH_API_URL ||
  "https://mobilepay-v2-api.onrender.com/api/integrations/comix/members/link-card";
const TIMEOUT_MS = 45000; // l'API est hébergée sur Render : premier appel parfois lent (réveil du service)

const TABLES_MEMBRES = [proprietaires, chauffeurs, elements];

export function normaliserCodeOrzayah(valeur) {
  if (!valeur) return null;
  let code = String(valeur).trim().toUpperCase().replace(/\s+/g, "");
  if (!code) return null;
  if (!code.startsWith("ORZ-")) code = `ORZ-${code.replace(/^ORZ-?/, "")}`;
  return code;
}

export function codeOrzayahValide(code) {
  return /^ORZ-[A-Z0-9]{4,20}$/.test(code || "");
}

function normaliserTelephone(tel) {
  return String(tel || "").replace(/[^\d+]/g, "");
}

// Champs ORZAYAH qu'un client ne doit jamais pouvoir écrire directement.
export function retirerChampsOrzayahServeur(values) {
  delete values.orzayahStatut;
  delete values.orzayahErreur;
  delete values.orzayahMerchantId;
  delete values.orzayahQrUrl;
  delete values.orzayahQrImage;
  delete values.orzayahLieAt;
  if ("orzayahCompte" in values) values.orzayahCompte = normaliserCodeOrzayah(values.orzayahCompte);
  return values;
}

// Un code ne peut être lié qu'à un seul membre, toutes catégories confondues.
async function codeDejaUtilise(code, table, idCourant) {
  for (const t of TABLES_MEMBRES) {
    const rows = await db.select({ id: t.id }).from(t).where(eq(t.orzayahCompte, code));
    if (rows.some((r) => !(t === table && r.id === idCourant))) return true;
  }
  return false;
}

export async function appelerApi({ code, businessName, ownerPhone }) {
  const apiKey = process.env.ORZAYAH_API_KEY;
  if (!apiKey) throw new Error("Intégration ORZAYAH non configurée (ORZAYAH_API_KEY manquante sur le serveur).");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
      body: JSON.stringify({ qrCode: code, businessName, ownerPhone, country: "CI" }),
      signal: ctrl.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw new Error("Le service ORZAYAH n'a pas répondu à temps. Réessayez en enregistrant à nouveau la fiche.");
    throw new Error("Service ORZAYAH injoignable. Réessayez en enregistrant à nouveau la fiche.");
  } finally {
    clearTimeout(timer);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    const msg = json.error?.message || json.error || json.message || `ORZAYAH a répondu ${res.status}`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  const data = json.data || {};
  if (!data.qrImage?.imageDataUrl) throw new Error("Réponse ORZAYAH incomplète : image du QR absente.");
  return data;
}

/* Lie le compte ORZAYAH du membre `row` (déjà enregistré dans `table`).
   Renvoie toujours la ligne à jour (liée, en erreur ou inchangée). */
export async function lierCompteOrzayah(table, row, { force = false } = {}) {
  const code = normaliserCodeOrzayah(row?.orzayahCompte);
  if (!row || !code) return row;
  if (!force && row.orzayahStatut === "lie" && row.orzayahQrImage) return row;

  const enregistrer = async (patch) => {
    const [maj] = await db.update(table).set(patch).where(eq(table.id, row.id)).returning();
    return maj || row;
  };

  if (!codeOrzayahValide(code)) {
    return enregistrer({ orzayahCompte: code, orzayahStatut: "erreur", orzayahErreur: "Numéro de compte ORZAYAH invalide (format attendu : ORZ-XXXXXXXX)." });
  }
  const telephone = normaliserTelephone(row.contact1);
  if (!telephone) {
    return enregistrer({ orzayahCompte: code, orzayahStatut: "erreur", orzayahErreur: "Contact 1 requis : c'est le numéro rattaché au compte ORZAYAH." });
  }
  if (await codeDejaUtilise(code, table, row.id)) {
    return enregistrer({ orzayahCompte: code, orzayahStatut: "erreur", orzayahErreur: "Ce numéro de compte ORZAYAH est déjà attribué à un autre membre." });
  }

  try {
    const data = await appelerApi({
      code,
      businessName: `${row.prenoms || ""} ${row.nom || ""}`.trim(),
      ownerPhone: telephone,
    });
    return enregistrer({
      orzayahCompte: data.qrImage.code || code,
      orzayahStatut: "lie",
      orzayahErreur: null,
      orzayahMerchantId: data.merchant?.id ? String(data.merchant.id) : null,
      orzayahQrUrl: data.qrImage.url || null,
      orzayahQrImage: data.qrImage.imageDataUrl,
      orzayahLieAt: new Date(),
    });
  } catch (err) {
    console.error("ORZAYAH link-card:", code, err.message);
    return enregistrer({ orzayahCompte: code, orzayahStatut: "erreur", orzayahErreur: err.message.slice(0, 500) });
  }
}

/* PATCH : relance la liaison si le code a changé ou n'est pas encore lié.
   Un code vidé délie la carte côté COMIX (le compte ORZAYAH, lui, subsiste). */
export async function traiterPatchOrzayah(table, avant, apres) {
  if (!apres) return apres;
  const codeAvant = normaliserCodeOrzayah(avant?.orzayahCompte);
  const codeApres = normaliserCodeOrzayah(apres.orzayahCompte);
  if (!codeApres) {
    if (!codeAvant) return apres;
    const [maj] = await db.update(table).set({
      orzayahStatut: null, orzayahErreur: null, orzayahMerchantId: null,
      orzayahQrUrl: null, orzayahQrImage: null, orzayahLieAt: null,
    }).where(eq(table.id, apres.id)).returning();
    return maj || apres;
  }
  const change = codeApres !== codeAvant;
  if (change || apres.orzayahStatut !== "lie") return lierCompteOrzayah(table, apres, { force: true });
  return apres;
}
