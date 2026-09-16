import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "comix-ci-dev-secret-a-changer";

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

// { role: 'admin' } | { role: 'commission_mixte', commissionMixteId, nom }
// | { role: 'syndicat', syndicatId, commissionMixteId, nom }
export function getAuth(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export function requireAuth(req, res) {
  const auth = getAuth(req);
  if (!auth) {
    res.status(401).json({ error: "Authentification requise." });
    return null;
  }
  return auth;
}

// Réservé à l'administrateur général COMIX-CI.
export function requireAdmin(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return null;
  if (!estAdministrateur(auth)) {
    res.status(403).json({ error: "Réservé à l'administrateur général." });
    return null;
  }
  return auth;
}

/* Un agent enroleur agit au nom de son entite de rattachement. Ce helper
   dit si un enregistrement tombe dans son perimetre, afin que les controles
   de propriete des routes ne le bloquent pas sur ce qu'il a le droit de
   gerer. `syndicatIdsDeLaCommission` n'est calcule que si necessaire. */
export async function agentPeutGerer(auth) {
  // Acces complet au registre pour tout agent enroleur : il consulte et
  // met a jour n'importe quel membre, vehicule ou dossier. Les fonctions
  // d'administration (creation de commissions, collectifs, agents) lui
  // restent fermees, faute de figurer dans son menu et dans les routes
  // correspondantes.
  return auth.role === "agent";
}

/* Un agent cree par l'administrateur general dispose du meme profil que
   lui : menu complet et acces aux pages d'administration. Les agents
   crees par une commission mixte ou un collectif gardent le leur. */
export function estAdministrateur(auth) {
  return auth?.role === "admin"
    || (auth?.role === "agent" && auth?.parentType === "admin");
}
