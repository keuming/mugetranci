import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { commissionsMixtes, syndicats, garesRoutieres, agents, associations } from "../../db/schema.js";
import { signToken } from "../../lib/auth.js";

/* Comptes administrateurs.
   ADMIN_LOGIN / ADMIN_PIN definissent le compte historique.
   ADMIN_ACCOUNTS permet d'en declarer plusieurs, separes par des
   virgules, chacun au format "login:pin" — par exemple :
     0707400716:1234,0712247755:0712
   Les identifiants ne sont jamais stockes en base : ils restent dans
   les variables d'environnement Vercel. */
const ADMIN_LOGIN = process.env.ADMIN_LOGIN || "admin";
const ADMIN_PIN = process.env.ADMIN_PIN || "1234";

const COMPTES_ADMIN = [
  { login: ADMIN_LOGIN, pin: ADMIN_PIN },
  ...(process.env.ADMIN_ACCOUNTS || "")
    .split(",")
    .map((paire) => paire.trim())
    .filter(Boolean)
    .map((paire) => {
      const i = paire.lastIndexOf(":");
      return i === -1 ? null : { login: paire.slice(0, i).trim(), pin: paire.slice(i + 1).trim() };
    })
    .filter((x) => x && x.login && x.pin),
];

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { login, pin } = req.body || {};
  if (!login || !pin) {
    return res.status(400).json({ error: "Identifiant et code PIN requis" });
  }

  if (COMPTES_ADMIN.some((a) => a.login === login && a.pin === pin)) {
    const token = signToken({ role: "admin" });
    return res.status(200).json({ token, role: "admin", nom: "Administrateur général COMIX-CI" });
  }

  const [commission] = await db.select().from(commissionsMixtes).where(eq(commissionsMixtes.login, login));
  if (commission && commission.pinCode && commission.pinCode === pin) {
    const token = signToken({ role: "commission_mixte", commissionMixteId: commission.id, nom: commission.nom });
    return res.status(200).json({ token, role: "commission_mixte", commissionMixteId: commission.id, nom: commission.nom, sigle: commission.sigle, logoUrl: commission.logoUrl });
  }

  const [syndicat] = await db.select().from(syndicats).where(eq(syndicats.login, login));
  if (syndicat && syndicat.pinCode && syndicat.pinCode === pin) {
    const token = signToken({ role: "syndicat", syndicatId: syndicat.id, commissionMixteId: syndicat.commissionMixteId, nom: syndicat.nom });
    return res.status(200).json({ token, role: "syndicat", syndicatId: syndicat.id, commissionMixteId: syndicat.commissionMixteId, nom: syndicat.nom, sigle: syndicat.sigle, logoUrl: syndicat.logoUrl });
  }

  const [gare] = await db.select().from(garesRoutieres).where(eq(garesRoutieres.login, login));
  if (gare && gare.pinCode && gare.pinCode === pin) {
    const token = signToken({ role: "gare", gareRoutiereId: gare.id, syndicatId: gare.syndicatId, nom: gare.nom });
    return res.status(200).json({ token, role: "gare", gareRoutiereId: gare.id, syndicatId: gare.syndicatId, nom: gare.nom, sigle: gare.sigle, logoUrl: gare.logoUrl });
  }

  const [asso] = await db.select().from(associations).where(eq(associations.login, login));
  if (asso && asso.pinCode && asso.pinCode === pin) {
    const token = signToken({ role: "association", associationId: asso.id, syndicatId: asso.syndicatId, nom: asso.nom });
    return res.status(200).json({ token, role: "association", associationId: asso.id, syndicatId: asso.syndicatId, nom: asso.nom, sigle: asso.sigle, logoUrl: asso.logoUrl });
  }

  const [agent] = await db.select().from(agents).where(eq(agents.login, login));
  if (agent && agent.actif && agent.pinCode === pin) {
    const token = signToken({ role: "agent", agentId: agent.id, parentType: agent.parentType, parentId: agent.parentId, nom: `${agent.prenoms} ${agent.nom}` });
    return res.status(200).json({ token, role: "agent", agentId: agent.id, parentType: agent.parentType, parentId: agent.parentId, nom: `${agent.prenoms} ${agent.nom}` });
  }

  return res.status(401).json({ error: "Identifiant ou code PIN incorrect." });
}
