import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { commissionsMixtes, syndicats } from "../../db/schema.js";
import { signToken } from "../../lib/auth.js";

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
    return res.status(200).json({ token, role: "admin", nom: "Administrateur général COMIX-CI" });
  }

  const [commission] = await db.select().from(commissionsMixtes).where(eq(commissionsMixtes.login, login));
  if (commission && commission.pinCode && commission.pinCode === pin) {
    const token = signToken({ role: "commission_mixte", commissionMixteId: commission.id, nom: commission.nom });
    return res.status(200).json({ token, role: "commission_mixte", commissionMixteId: commission.id, nom: commission.nom });
  }

  const [syndicat] = await db.select().from(syndicats).where(eq(syndicats.login, login));
  if (syndicat && syndicat.pinCode && syndicat.pinCode === pin) {
    const token = signToken({ role: "syndicat", syndicatId: syndicat.id, commissionMixteId: syndicat.commissionMixteId, nom: syndicat.nom });
    return res.status(200).json({ token, role: "syndicat", syndicatId: syndicat.id, commissionMixteId: syndicat.commissionMixteId, nom: syndicat.nom });
  }

  return res.status(401).json({ error: "Identifiant ou code PIN incorrect." });
}
