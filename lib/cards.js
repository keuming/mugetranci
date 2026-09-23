import { db } from "../db/index.js";

// Numéro de carte : PREFIXE + JJ (jour) + rang à 3 chiffres (nombre
// d'enregistrements déjà existants dans CETTE catégorie, à partir de 000)
// + MM (mois) + AA (2 derniers chiffres de l'année).
// Préfixe par catégorie pour distinguer d'un coup d'œil le type de carte :
//   T = Transporteur, C = Chauffeur, E = Élément (employé du collectif)
export async function genererNumeroCarte(table, prefix, numeroColumn = "numeroCarte") {
  const rows = await db.select().from(table);
  const now = new Date();
  const jj = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const aa = String(now.getFullYear()).slice(-2);

  // Plusieurs agents enrolent en parallele : un simple comptage attribuait
  // le meme numero a deux membres crees en meme temps. On avance donc
  // jusqu'au premier numero reellement libre.
  const pris = new Set(rows.map((r) => r[numeroColumn]).filter(Boolean));
  let rang = rows.length;
  let numero;
  do {
    numero = `${prefix}${jj}${String(rang).padStart(3, "0")}${mm}${aa}`;
    rang++;
  } while (pris.has(numero) && rang < rows.length + 1000);
  return numero;
}

// Numero de la carte "Droit d'exploitation de ligne" : NNNN/AA (sequence
// continue sur 4 chiffres, suivie des 2 derniers chiffres de l'annee),
// au format du modele physique CSTY-COSYNCY fourni par l'utilisateur.
export async function genererNumeroLigne(table, numeroColumn = "numeroCarteLigne") {
  const rows = await db.select().from(table);
  const aa = String(new Date().getFullYear()).slice(-2);
  const pris = new Set(rows.map((r) => r[numeroColumn]).filter(Boolean));
  let rang = rows.length + 1;
  let numero;
  do {
    numero = `${String(rang).padStart(4, "0")}/${aa}`;
    rang++;
  } while (pris.has(numero) && rang < rows.length + 1000);
  return numero;
}
