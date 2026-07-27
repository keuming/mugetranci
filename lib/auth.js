import jwt from "jsonwebtoken";

// IMPORTANT : définissez JWT_SECRET dans les variables d'environnement
// (Vercel + .env.local) en production. Cette valeur par défaut n'est là
// que pour ne pas bloquer le développement local.
const SECRET = process.env.JWT_SECRET || "mugetranci-dev-secret-a-changer";

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

// Renvoie { role: 'admin' } ou { role: 'gare', gareId, nom } si le jeton
// est valide, sinon null.
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

// À appeler en tout début de chaque route protégée :
//   const auth = requireAuth(req, res); if (!auth) return;
export function requireAuth(req, res) {
  const auth = getAuth(req);
  if (!auth) {
    res.status(401).json({ error: "Authentification requise." });
    return null;
  }
  return auth;
}

// À appeler pour les routes réservées à l'administrateur (gestion des
// gares elles-mêmes, par exemple).
export function requireAdmin(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return null;
  if (auth.role !== "admin") {
    res.status(403).json({ error: "Réservé à l'administrateur MUGETRAN-CI." });
    return null;
  }
  return auth;
}
