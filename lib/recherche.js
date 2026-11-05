import { and, or, eq, ne, sql, inArray, ilike, isNull, lt, lte, gte } from "drizzle-orm";
import { db } from "../db/index.js";
import { signToken } from "./auth.js";
import {
  vehicules, proprietaires, chauffeurs, vehiculeChauffeurs, affectations,
  syndicats, garesRoutieres, lignes,
} from "../db/schema.js";

/* Recherche du registre pour find.comix-ci.com.
   Connexion obligatoire (tout compte sauf imprimeur), lecture seule, tout le
   registre. Aucune migration : requetes sur les colonnes existantes. */

const DOCS = [
  { cle: "visite", label: "Visite technique", col: vehicules.visiteTechniqueDateFin, champ: "visiteTechniqueDateFin" },
  { cle: "assurance", label: "Assurance", col: vehicules.assuranceAutoDateFin, champ: "assuranceAutoDateFin" },
  { cle: "vignette", label: "Vignette", col: vehicules.vignetteDateFin, champ: "vignetteDateFin" },
  { cle: "stationnement", label: "Carte de stationnement", col: vehicules.carteStationnementDateFin, champ: "carteStationnementDateFin" },
];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMITE = 30;

function aujourdhui() { return new Date().toISOString().slice(0, 10); }
function jours(dateStr) {
  if (!dateStr) return null;
  const d = new Date(String(dateStr).slice(0, 10) + "T00:00:00Z").getTime();
  const t = new Date(aujourdhui() + "T00:00:00Z").getTime();
  return Math.round((d - t) / 86400000);
}
// statut : ajour | bientot (30 j) | perime | manquant
export function statutDoc(dateStr) {
  const j = jours(dateStr);
  if (j === null) return { statut: "manquant", jours: null };
  if (j < 0) return { statut: "perime", jours: j };
  if (j <= 30) return { statut: "bientot", jours: j };
  return { statut: "ajour", jours: j };
}
const docsVehicule = (v) => DOCS.map((d) => ({ cle: d.cle, label: d.label, date: v[d.champ] || null, ...statutDoc(v[d.champ]) }));

const nettoyerTexte = (s) => String(s || "").trim().replace(/[%_\\]/g, " ").replace(/\s+/g, " ").slice(0, 80);
const alphaNum = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const chiffres = (s) => String(s || "").replace(/\D/g, "");

const platNorm = sql`regexp_replace(upper(${vehicules.immatriculation}), '[^A-Z0-9]', '', 'g')`;
const tel = (col) => sql`regexp_replace(coalesce(${col}, ''), '\\D', '', 'g')`;

function condNom(mots, colNom, colPrenoms) {
  return and(...mots.map((m) => or(ilike(colNom, `%${m}%`), ilike(colPrenoms, `%${m}%`))));
}

async function idsVehiculesParTexte(q) {
  const mots = q.split(" ").filter((m) => m.length >= 2);
  const plaque = alphaNum(q);
  const num = chiffres(q);
  const conds = [];
  if (plaque.length >= 2) conds.push(sql`${platNorm} like ${"%" + plaque + "%"}`);
  const motif = `%${q}%`;
  conds.push(ilike(vehicules.carteGrise, motif), ilike(vehicules.chassis, motif),
    ilike(vehicules.numeroMacaron, motif), ilike(vehicules.numeroCarteLigne, motif),
    ilike(vehicules.nomCarteGrise, motif), ilike(vehicules.proprietaireReelNom, motif));

  // Transporteurs
  const condP = [];
  if (mots.length) condP.push(condNom(mots, proprietaires.nom, proprietaires.prenoms));
  if (num.length >= 4) condP.push(sql`${tel(proprietaires.contact1)} like ${"%" + num + "%"}`, sql`${tel(proprietaires.contact2)} like ${"%" + num + "%"}`);
  condP.push(ilike(proprietaires.carteTransporteurNumero, motif));
  const pIds = (await db.select({ id: proprietaires.id }).from(proprietaires).where(or(...condP)).limit(300)).map((r) => r.id);
  if (pIds.length) conds.push(inArray(vehicules.proprietaireId, pIds));
  if (num.length >= 4) {
    conds.push(sql`${tel(vehicules.proprietaireReelContact)} like ${"%" + num + "%"}`);
  }

  // Chauffeurs
  const condC = [];
  if (mots.length) condC.push(condNom(mots, chauffeurs.nom, chauffeurs.prenoms));
  if (num.length >= 4) condC.push(sql`${tel(chauffeurs.contact1)} like ${"%" + num + "%"}`, sql`${tel(chauffeurs.contact2)} like ${"%" + num + "%"}`, sql`${tel(chauffeurs.contact3)} like ${"%" + num + "%"}`);
  condC.push(ilike(chauffeurs.numeroCarte, motif), ilike(chauffeurs.permisNumero, motif));
  const cIds = (await db.select({ id: chauffeurs.id }).from(chauffeurs).where(or(...condC)).limit(300)).map((r) => r.id);
  if (cIds.length) {
    const liens = await db.select({ v: vehiculeChauffeurs.vehiculeId }).from(vehiculeChauffeurs)
      .where(and(eq(vehiculeChauffeurs.actif, true), inArray(vehiculeChauffeurs.chauffeurId, cIds)));
    const vIds = [...new Set(liens.map((l) => l.v))];
    if (vIds.length) conds.push(inArray(vehicules.id, vIds));
  }
  return or(...conds);
}

function condFiltreDoc(doc, etat, avant) {
  const cols = doc === "tous" ? DOCS.map((d) => d.col) : DOCS.filter((d) => d.cle === doc).map((d) => d.col);
  if (!cols.length) return null;
  const auj = aujourdhui();
  const plus30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const parCol = (c) => {
    if (etat === "nonajour") return or(isNull(c), lt(c, auj));
    if (etat === "perime") return lt(c, auj);
    if (etat === "bientot") return and(gte(c, auj), lte(c, plus30));
    if (etat === "manquant") return isNull(c);
    if (etat === "ajour") return gte(c, auj);
    return null;
  };
  const parts = [];
  for (const c of cols) {
    const base = parCol(c);
    const fin = avant ? lte(c, avant) : null;
    const m = base && fin ? and(base, fin) : (base || fin);
    if (m) parts.push(m);
  }
  if (!parts.length) return null;
  // « ajour » sur « tous » = tous les documents a jour ; sinon un seul suffit
  return etat === "ajour" && cols.length > 1 ? and(...parts) : or(...parts);
}

const nomComplet = (p) => p ? `${p.nom || ""} ${p.prenoms || ""}`.trim() : null;
const contacts = (o) => [o?.contact1, o?.contact2, o?.contact3].filter(Boolean);

async function chargerChauffeurs(vehiculeIds) {
  if (!vehiculeIds.length) return {};
  const liens = await db.select().from(vehiculeChauffeurs)
    .where(and(eq(vehiculeChauffeurs.actif, true), inArray(vehiculeChauffeurs.vehiculeId, vehiculeIds)));
  const ids = [...new Set(liens.map((l) => l.chauffeurId))];
  const lignesC = ids.length ? await db.select().from(chauffeurs).where(inArray(chauffeurs.id, ids)) : [];
  const parId = Object.fromEntries(lignesC.map((c) => [c.id, c]));
  const out = {};
  for (const l of liens) if (parId[l.chauffeurId]) (out[l.vehiculeId] ||= []).push(parId[l.chauffeurId]);
  return out;
}

export async function gererRecherche(req, res, auth) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }
  if (auth.role === "imprimeur") return res.status(403).json({ error: "Accès refusé." });
  const param = (k) => { const v = req.query[k]; return Array.isArray(v) ? v[0] : v; };

  try {
    // ---- Fiche complete d'un vehicule (photos, carte du transporteur, point focal)
    const id = param("id");
    if (id) {
      if (!UUID_RE.test(id)) return res.status(400).json({ error: "Identifiant invalide." });
      const [v] = await db.select().from(vehicules).where(eq(vehicules.id, id));
      if (!v) return res.status(404).json({ error: "Véhicule introuvable." });
      const [p] = v.proprietaireId ? await db.select().from(proprietaires).where(eq(proprietaires.id, v.proprietaireId)) : [null];
      const chs = (await chargerChauffeurs([v.id]))[v.id] || [];
      const [coll] = v.syndicatId ? await db.select({ nom: syndicats.nom, sigle: syndicats.sigle, logoUrl: syndicats.logoUrl }).from(syndicats).where(eq(syndicats.id, v.syndicatId)) : [null];
      const [aff] = await db.select().from(affectations).where(and(eq(affectations.vehiculeId, v.id), eq(affectations.actif, true)));
      let gare = null, ligne = null;
      if (aff?.gareRoutiereId) {
        [gare] = await db.select().from(garesRoutieres).where(eq(garesRoutieres.id, aff.gareRoutiereId));
        if (aff.ligneId) [ligne] = await db.select().from(lignes).where(eq(lignes.id, aff.ligneId));
      }
      const docP = (label, d) => ({ label, date: d || null, ...statutDoc(d) });
      return res.status(200).json({
        vehicule: {
          id: v.id, immatriculation: v.immatriculation, marque: v.marque, modele: v.modele, categorie: v.categorie,
          couleur: v.couleur, energie: v.energie, nombrePlaces: v.nombrePlaces, carteGrise: v.carteGrise,
          chassis: v.chassis, numeroMacaron: v.numeroMacaron, numeroCarteLigne: v.numeroCarteLigne,
          photoUrl: v.photoUrl, documents: docsVehicule(v),
        },
        transporteur: p ? {
          nom: nomComplet(p), numeroCarte: p.carteTransporteurNumero, contacts: contacts(p), photoUrl: p.photoUrl,
          fonction: p.fonction || null, ville: p.ville || null, quartier: p.quartier || null,
          collectif: coll || null,
          documents: [docP("Permis de conduire", p.permisDateFin), docP("Carte d'identité (CNI)", p.cniDateFin)],
        } : null,
        proprietaireReel: v.proprietaireReelNom ? { nom: v.proprietaireReelNom, contact: v.proprietaireReelContact } : null,
        chauffeurs: chs.map((c) => ({
          id: c.id, nom: nomComplet(c), numeroCarte: c.numeroCarte, contacts: contacts(c), photoUrl: c.photoUrl,
          permis: docP("Permis de conduire", c.permisDateFin), numeroPermis: c.permisNumero,
        })),
        pointFocal: gare ? {
          gare: gare.nom, commune: gare.commune, chefGare: gare.responsableNom, chefGareContact: gare.responsableContact,
          ligne: ligne ? `${ligne.lieuDepart} — ${ligne.lieuArrivee}` : null,
        } : null,
      });
    }

    // ---- Recherche multicritere
    const q = nettoyerTexte(param("q"));
    const doc = ["visite", "assurance", "vignette", "stationnement", "tous"].includes(param("doc")) ? param("doc") : null;
    const etat = ["nonajour", "perime", "bientot", "manquant", "ajour"].includes(param("etat")) ? param("etat") : null;
    const avantBrut = param("avant");
    const avant = avantBrut && /^\d{4}-\d{2}-\d{2}$/.test(avantBrut) ? avantBrut : null;
    const filtreDoc = doc && (etat || avant) ? condFiltreDoc(doc, etat, avant) : null;

    if (q.length < 2 && !filtreDoc) {
      return res.status(400).json({ error: "Écrivez au moins 2 lettres ou chiffres, ou choisissez un document à vérifier." });
    }
    const conds = [];
    if (q.length >= 2) conds.push(await idsVehiculesParTexte(q));
    if (filtreDoc) conds.push(filtreDoc);
    const where = and(...conds);

    const [{ total }] = await db.select({ total: sql`count(*)::int` }).from(vehicules).where(where);
    const rows = await db.select({
      id: vehicules.id, immatriculation: vehicules.immatriculation, marque: vehicules.marque, modele: vehicules.modele,
      categorie: vehicules.categorie, couleur: vehicules.couleur, proprietaireId: vehicules.proprietaireId,
      visiteTechniqueDateFin: vehicules.visiteTechniqueDateFin, assuranceAutoDateFin: vehicules.assuranceAutoDateFin,
      vignetteDateFin: vehicules.vignetteDateFin, carteStationnementDateFin: vehicules.carteStationnementDateFin,
    }).from(vehicules).where(where).orderBy(vehicules.immatriculation).limit(LIMITE);

    const pIds = [...new Set(rows.map((r) => r.proprietaireId).filter(Boolean))];
    const props = pIds.length ? await db.select({ id: proprietaires.id, nom: proprietaires.nom, prenoms: proprietaires.prenoms, contact1: proprietaires.contact1, contact2: proprietaires.contact2 }).from(proprietaires).where(inArray(proprietaires.id, pIds)) : [];
    const propParId = Object.fromEntries(props.map((p) => [p.id, p]));
    const chsParV = await chargerChauffeurs(rows.map((r) => r.id));

    return res.status(200).json({
      total, limite: LIMITE,
      resultats: rows.map((r) => {
        const docs = docsVehicule(r);
        return {
          id: r.id, immatriculation: r.immatriculation,
          description: [r.marque, r.modele, r.couleur].filter(Boolean).join(" "), categorie: r.categorie,
          proprietaire: r.proprietaireId && propParId[r.proprietaireId] ? { nom: nomComplet(propParId[r.proprietaireId]), contacts: contacts(propParId[r.proprietaireId]) } : null,
          chauffeurs: (chsParV[r.id] || []).map((c) => ({ nom: nomComplet(c), contacts: contacts(c) })),
          documents: docs,
          tousAJour: docs.every((d) => d.statut === "ajour" || d.statut === "bientot"),
        };
      }),
    });
  } catch (err) {
    console.error("GET recherche:", err);
    return res.status(500).json({ error: "La recherche a échoué. Réessayez dans un instant." });
  }
}


/* ============================================================
   ACCES PAR NUMERO DE TELEPHONE (sans PIN)
   Table creee automatiquement au premier appel (aucune migration a
   lancer) et amorcee avec la liste initiale. Les administrateurs
   ajoutent / retirent des numeros depuis le tableau de bord.
   ============================================================ */
const AMORCE = [
  ["Diabaté Amidou Eric", "0140481400"], ["Losseni Diabaté", "0749942249"], ["Cisse Ahmed", "0707707015"],
  ["Soumahoro Vessou", "0707811619"], ["Diahou Jack Diomandé", "0758225144"], ["Vafoumbe Soumahoro", "0747739645"],
  ["Doumbia Siriki", "0102024066"], ["Doumbia Kassoum", "0708049514"], ["Soumahoro Lassina St", "0505031890"],
];
let tableOk = false;
async function assurerTable() {
  if (tableOk) return;
  await db.execute(sql`create table if not exists recherche_acces (
    id uuid primary key default gen_random_uuid(),
    nom varchar(160) not null,
    telephone varchar(20) not null unique,
    actif boolean not null default true,
    cree_par varchar(160),
    created_at timestamp not null default now()
  )`);
  const [{ n }] = (await db.execute(sql`select count(*)::int as n from recherche_acces`)).rows;
  if (n === 0) {
    for (const [nom, t] of AMORCE) {
      await db.execute(sql`insert into recherche_acces (nom, telephone, cree_par) values (${nom}, ${t}, 'amorce') on conflict (telephone) do nothing`);
    }
  }
  tableOk = true;
}
export function normaliserTelephone(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.startsWith("00225")) d = d.slice(5);
  else if (d.startsWith("225") && d.length > 10) d = d.slice(3);
  return d;
}

// Public : connexion par numero seul.
export async function connexionRecherche(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "Méthode non autorisée" }); }
  try {
    await assurerTable();
    const t = normaliserTelephone((req.body || {}).telephone);
    if (t.length < 8) return res.status(400).json({ error: "Écrivez votre numéro de téléphone." });
    const r = (await db.execute(sql`select id, nom, actif from recherche_acces where telephone = ${t}`)).rows[0];
    if (!r || !r.actif) return res.status(401).json({ error: "Ce numéro n'a pas accès. Demandez à l'administrateur de l'ajouter." });
    const token = signToken({ role: "recherche", accesId: r.id, nom: r.nom });
    return res.status(200).json({ token, role: "recherche", nom: r.nom });
  } catch (err) {
    console.error("recherche-login:", err);
    return res.status(500).json({ error: "Connexion impossible pour le moment. Réessayez." });
  }
}

// Administrateur : liste / ajout / activation / suppression des numeros.
export async function gererAccesRecherche(req, res, auth) {
  if (auth.role !== "admin" && !(auth.role === "agent" && auth.parentType === "admin")) {
    return res.status(403).json({ error: "Réservé à l'administrateur général." });
  }
  try {
    await assurerTable();
    const id = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    if (req.method === "GET") {
      const rows = (await db.execute(sql`select id, nom, telephone, actif, created_at from recherche_acces order by nom`)).rows;
      return res.status(200).json(rows);
    }
    if (req.method === "POST") {
      const nom = String((req.body || {}).nom || "").trim().slice(0, 160);
      const t = normaliserTelephone((req.body || {}).telephone);
      if (!nom || t.length < 8) return res.status(400).json({ error: "Nom et numéro de téléphone requis." });
      const ex = (await db.execute(sql`select id from recherche_acces where telephone = ${t}`)).rows[0];
      if (ex) return res.status(409).json({ error: "Ce numéro est déjà dans la liste." });
      const r = (await db.execute(sql`insert into recherche_acces (nom, telephone, cree_par) values (${nom}, ${t}, ${auth.nom || auth.role}) returning id, nom, telephone, actif, created_at`)).rows[0];
      return res.status(201).json(r);
    }
    if (!id || !UUID_RE.test(id)) return res.status(400).json({ error: "Identifiant invalide." });
    if (req.method === "PATCH") {
      const b = req.body || {};
      if (typeof b.actif === "boolean") await db.execute(sql`update recherche_acces set actif = ${b.actif} where id = ${id}`);
      if (typeof b.nom === "string" && b.nom.trim()) await db.execute(sql`update recherche_acces set nom = ${b.nom.trim().slice(0, 160)} where id = ${id}`);
      const r = (await db.execute(sql`select id, nom, telephone, actif, created_at from recherche_acces where id = ${id}`)).rows[0];
      return r ? res.status(200).json(r) : res.status(404).json({ error: "Introuvable." });
    }
    if (req.method === "DELETE") {
      await db.execute(sql`delete from recherche_acces where id = ${id}`);
      return res.status(200).json({ ok: true });
    }
    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ error: "Méthode non autorisée" });
  } catch (err) {
    console.error("recherche-acces:", err);
    return res.status(500).json({ error: "Opération impossible pour le moment." });
  }
}
