import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { achatsCarburant, chauffeurs, vehicules, syndicats } from "../db/schema.js";
import { requireAuth } from "../lib/auth.js";

// Taux de commission de la mutuelle sur chaque achat de carburant.
// Ajustable ici — pas encore de paramétrage en base pour ce taux.
const COMMISSION_RATE = 0.02; // 2%

function toApi(row, chauffeur, vehicule) {
  return {
    id: row.id,
    chauffeurId: row.chauffeurId,
    vehiculeId: row.vehiculeId,
    carteGrise: row.carteGrise,
    volumeLitres: Number(row.volumeLitres),
    montantFcfa: row.montantFcfa,
    commissionFcfa: row.commissionFcfa,
    station: row.station,
    createdAt: row.createdAt,
    chauffeurNom: chauffeur ? `${chauffeur.prenoms} ${chauffeur.nom}` : null,
    immatriculation: vehicule ? vehicule.immatriculation : null,
  };
}

export default async function handler(req, res) {
  const auth = requireAuth(req, res);
  if (!auth) return;

  if (req.method === "GET") {
    const [rows, allChauffeurs, allVehicules] = await Promise.all([
      db.select().from(achatsCarburant).orderBy(desc(achatsCarburant.createdAt)),
      db.select().from(chauffeurs),
      db.select().from(vehicules),
    ]);

    let visibleRows = rows;
    if (auth.role === "syndicat") {
      const myChauffeurIds = new Set(allChauffeurs.filter((c) => c.syndicatId === auth.syndicatId).map((c) => c.id));
      visibleRows = rows.filter((r) => myChauffeurIds.has(r.chauffeurId));
    } else if (auth.role === "commission_mixte") {
      const mySyndicats = await db.select().from(syndicats).where(eq(syndicats.commissionMixteId, auth.commissionMixteId));
      const mySyndicatIds = new Set(mySyndicats.map((s) => s.id));
      const myChauffeurIds = new Set(allChauffeurs.filter((c) => mySyndicatIds.has(c.syndicatId)).map((c) => c.id));
      visibleRows = rows.filter((r) => myChauffeurIds.has(r.chauffeurId));
    }

    const result = visibleRows.map((r) => toApi(
      r,
      allChauffeurs.find((c) => c.id === r.chauffeurId),
      allVehicules.find((v) => v.id === r.vehiculeId)
    ));
    return res.status(200).json(result);
  }

  if (req.method === "POST") {
    const body = req.body || {};
    if (!body.chauffeurId || !body.carteGrise || !body.volumeLitres || !body.montantFcfa) {
      return res.status(400).json({ error: "chauffeurId, carteGrise, volumeLitres et montantFcfa sont requis" });
    }

    const montant = Math.round(Number(body.montantFcfa));
    const commission = Math.round(montant * COMMISSION_RATE);

    const [created] = await db.insert(achatsCarburant).values({
      chauffeurId: body.chauffeurId,
      vehiculeId: body.vehiculeId || null,
      carteGrise: body.carteGrise,
      volumeLitres: String(body.volumeLitres),
      montantFcfa: montant,
      commissionFcfa: commission,
      station: body.station || null,
    }).returning();

    const [chauffeur] = await db.select().from(chauffeurs).where(eq(chauffeurs.id, created.chauffeurId));
    const vehicule = created.vehiculeId
      ? (await db.select().from(vehicules).where(eq(vehicules.id, created.vehiculeId)))[0]
      : null;

    return res.status(201).json(toApi(created, chauffeur, vehicule));
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Méthode non autorisée" });
}
