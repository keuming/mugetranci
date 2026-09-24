import { db } from "../db/index.js";
import { proprietaires, chauffeurs, elements } from "../db/schema.js";

/* ============================================================
   ANTI-DOUBLONS — contrôle AVANT toute validation d'une saisie
   Deux membres peuvent porter le même nom, mais jamais le même :
     - N° de CNI, N° de permis, téléphone (Contact 1) — dans une même
       catégorie (un transporteur peut aussi être chauffeur) ;
     - N° de compte ORZAYAH (code du QR) et téléphone ORZAYAH — dans
       TOUTES les catégories : un QR n'appartient qu'à un seul membre.
   Les valeurs sont comparées normalisées (casse, espaces, tirets,
   indicatif +225) pour qu'une variante de saisie ne passe pas.
   Réponse : message explicite nommant le membre déjà enregistré.
   ============================================================ */

export function normPiece(v) {
  return String(v || "").toUpperCase().replace(/[\s.\-/]+/g, "");
}
export function normTel(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.startsWith("00225")) d = d.slice(5);
  else if (d.startsWith("225") && d.length === 13) d = d.slice(3);
  return d;
}

const CATEGORIES = {
  transporteur: { table: proprietaires, libelle: "transporteur", numero: "carteTransporteurNumero",
    champs: [["cni", "N° de CNI", normPiece], ["numeroPermis", "N° de permis", normPiece], ["contact1", "N° de téléphone (Contact 1)", normTel]] },
  chauffeur: { table: chauffeurs, libelle: "chauffeur", numero: "numeroCarte",
    champs: [["cni", "N° de CNI", normPiece], ["permisNumero", "N° de permis", normPiece], ["contact1", "N° de téléphone (Contact 1)", normTel]] },
  element: { table: elements, libelle: "élément", numero: "numeroCarte",
    champs: [["cni", "N° de CNI", normPiece], ["contact1", "N° de téléphone (Contact 1)", normTel]] },
};

function designation(row, cat) {
  const num = row[CATEGORIES[cat].numero];
  return `${row.prenoms || ""} ${row.nom || ""}`.trim() + ` (${CATEGORIES[cat].libelle}${num ? `, carte ${num}` : ""})`;
}

// Colonnes strictement nécessaires : on évite de charger les photos.
function colonnes(cat, cols) {
  const t = CATEGORIES[cat].table;
  const sel = { id: t.id, nom: t.nom, prenoms: t.prenoms, [CATEGORIES[cat].numero]: t[CATEGORIES[cat].numero] };
  for (const c of cols) sel[c] = t[c];
  return sel;
}

/* `fiche` : valeurs à contrôler (création : tout le corps ; modification :
   seulement les champs modifiés). `idCourant` : exclu (modification).
   Renvoie null si tout est libre, sinon le message d'erreur. */
export async function chercherDoublon(cat, fiche, idCourant = null) {
  const def = CATEGORIES[cat];
  const aControler = def.champs.filter(([col, , norm]) => col in fiche && norm(fiche[col]));
  if (aControler.length) {
    const rows = await db.select(colonnes(cat, aControler.map(([c]) => c))).from(def.table);
    for (const [col, libelle, norm] of aControler) {
      const v = norm(fiche[col]);
      const autre = rows.find((r) => r.id !== idCourant && norm(r[col]) === v);
      if (autre) return `Doublon : ce ${libelle} (${fiche[col]}) est déjà enregistré pour ${designation(autre, cat)}. Vérifiez qu'il ne s'agit pas de la même personne.`;
    }
  }

  // Compte ORZAYAH : unicité dans toutes les catégories.
  const code = normPiece(fiche.orzayahCompte);
  const tel = normTel(fiche.orzayahTelephone);
  if (code || tel) {
    for (const [autreCat, d] of Object.entries(CATEGORIES)) {
      const rows = await db.select(colonnes(autreCat, ["orzayahCompte", "orzayahTelephone"])).from(d.table);
      for (const r of rows) {
        if (autreCat === cat && r.id === idCourant) continue;
        if (code && normPiece(r.orzayahCompte) === code) return `Ce QR code ORZAYAH (${fiche.orzayahCompte}) est déjà attribué à ${designation(r, autreCat)}. Un QR code ne peut appartenir qu'à un seul membre.`;
        if (tel && normTel(r.orzayahTelephone) === tel) return `Ce N° de téléphone ORZAYAH (${fiche.orzayahTelephone}) est déjà utilisé par ${designation(r, autreCat)}.`;
      }
    }
  }
  return null;
}
