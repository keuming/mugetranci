import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { gares } from "../../db/schema.js";
import { signToken } from "../../lib/auth.js";

// IMPORTANT : définissez ADMIN_LOGIN et ADMIN_PIN dans les variables
// d'environnement (Vercel + .env.local). Les valeurs ci-dessous ne sont
// que des identifiants de secours pour le développement local — ne pas
// les utiliser en production.
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || "admin";
const ADMIN_PIN = process.env.ADMIN_PIN || "1234";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { login, pin } = req.body || {};
  if (!login || !pin) {
    return res.status(400).json({ error: "Identifiant et code PIN requis" });
  }

  if (login === ADMIN_LOGIN && pin === ADMIN_PIN) {
    const token = signToken({ role: "admin" });
    return res.status(200).json({ token, role: "admin", nom: "Administrateur MUGETRAN-CI" });
  }

  const [gare] = await db.select().from(gares).where(eq(gares.login, login));
  if (gare && gare.pinCode && gare.pinCode === pin) {
    const token = signToken({ role: "gare", gareId: gare.id, nom: gare.nom });
    return res.status(200).json({ token, role: "gare", gareId: gare.id, nom: gare.nom });
  }

  return res.status(401).json({ error: "Identifiant ou code PIN incorrect." });
}
