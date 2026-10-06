/* Nettoyage des saisies des fiches membres (création et modification) :
   espaces en trop, casse, lettre O tapée à la place du zéro dans un
   téléphone… Appliqué côté serveur pour que TOUTES les saisies (bureau,
   mobile, hors ligne, import) arrivent propres en base et sur les cartes. */
const espaces = (v) => String(v).replace(/\s+/g, " ").trim();

function nettoyerTelephone(v) {
  let t = espaces(v);
  // « O70833 0096 » -> « 070833 0096 » (uniquement si le reste est un numéro)
  if (/^[0-9Oo .+\-()]+$/.test(t) && /[Oo]/.test(t)) t = t.replace(/[Oo]/g, "0");
  return t;
}

export function nettoyerFiche(valeurs) {
  const v = valeurs || {};
  const out = { ...v };
  if (typeof v.nom === "string") out.nom = espaces(v.nom).toUpperCase();
  if (typeof v.prenoms === "string") out.prenoms = espaces(v.prenoms);
  for (const k of ["cni", "numeroPermis", "permisNumero"]) {
    if (typeof v[k] === "string") out[k] = v[k].replace(/\s+/g, "").toUpperCase();
  }
  for (const k of ["contact1", "contact2", "contact3"]) {
    if (typeof v[k] === "string") out[k] = nettoyerTelephone(v[k]) || null;
  }
  if (typeof v.email === "string") out.email = espaces(v.email).toLowerCase() || null;
  for (const k of ["ville", "quartier", "fonction", "fonctionAssociation"]) {
    if (typeof v[k] === "string") out[k] = espaces(v[k]) || null;
  }
  return out;
}
