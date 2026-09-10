import { db } from "../db/index.js";

// Numéro de carte : PREFIXE + JJ (jour) + rang à 3 chiffres (nombre
// d'enregistrements déjà existants dans CETTE catégorie, à partir de 000)
// + MM (mois) + AA (2 derniers chiffres de l'année).
// Préfixe par catégorie pour distinguer d'un coup d'œil le type de carte :
//   T = Transporteur, C = Chauffeur, E = Élément (employé du collectif)
export async function genererNumeroCarte(table, prefix) {
  const rows = await db.select().from(table);
  const total = rows.length;
  const now = new Date();
  const jj = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const aa = String(now.getFullYear()).slice(-2);
  const rang = String(total).padStart(3, "0");
  return `${prefix}${jj}${rang}${mm}${aa}`;
}
