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
  if (auth.role !== "admin") {
    res.status(403).json({ error: "Réservé à l'administrateur général." });
    return null;
  }
  return auth;
}

/* Un agent enroleur agit au nom de son entite de rattachement. Ce helper
   dit si un enregistrement tombe dans son perimetre, afin que les controles
   de propriete des routes ne le bloquent pas sur ce qu'il a le droit de
   gerer. `syndicatIdsDeLaCommission` n'est calcule que si necessaire. */
export async function agentPeutGerer(auth, row, chargerSyndicatsDeCommission) {
  if (auth.role !== "agent") return false;
  if (auth.parentType === "admin") return true;
  if (auth.parentType === "syndicat") return row.syndicatId === auth.parentId;
  if (auth.parentType === "commission_mixte") {
    if (row.creatorType === "commission_mixte" && row.creatorId === auth.parentId) return true;
    const ids = await chargerSyndicatsDeCommission(auth.parentId);
    return ids.has(row.syndicatId);
  }
  return false;
}
