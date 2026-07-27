import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  proprietaires, chauffeurs, vehicules, historiqueProprietaires, vehiculeChauffeurs,
  achatsCarburant, gares, lignes, affectations,
} from "../db/schema.js";
import { requireAuth } from "../lib/auth.js";

function toApiOwner(row) {
  const { photoUrl, ...rest } = row;
  return { ...rest, photo: photoUrl };
}
function toApiDriver(row) {
  const { photoUrl, qrPaiementUrl, ...rest } = row;
  return { ...rest, photo: photoUrl, qrPaiement: qrPaiementUrl };
}
function toApiVehicule(v, chauffeurIds, historique) {
  const {
    photoUrl, visiteTechniqueDateFin, assuranceAutoDateFin, vignetteDateFin, carteStationnementDateFin,
    ...rest
  } = v;
  return {
    ...rest,
    photo: photoUrl,
    documents: {
      visiteTechnique: visiteTechniqueDateFin,
      assuranceAuto: assuranceAutoDateFin,
      vignette: vignetteDateFin,
      carteStationnement: carteStationnementDateFin,
    },
    chauffeurIds,
    historiqueProprietaires: historique.map((h) => ({ proprietaireId: h.proprietaireId, depuis: h.depuis })),
  };
}
function toApiGare(row) {
  const { pinCode, ...rest } = row;
  return {
    ...rest,
    latitude: row.latitude !== null ? Number(row.latitude) : null,
    longitude: row.longitude !== null ? Number(row.longitude) : null,
    pinConfigure: !!pinCode,
  };
}
function toApiAchat(row, chauffeur, vehicule) {
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
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const auth = requireAuth(req, res);
  if (!auth) return;

  // Une seule invocation de fonction, toutes les lectures lancées en parallèle
  // (au lieu de 7 requêtes/fonctions séparées côté client) : réduit nettement
  // le temps de chargement initial du tableau de bord.
  const [
    allOwners, allDrivers, allVehicules, junctions, historiques,
    allAchats, allGares, allLignes, allAffectations,
  ] = await Promise.all([
    db.select().from(proprietaires),
    db.select().from(chauffeurs),
    db.select().from(vehicules),
    db.select().from(vehiculeChauffeurs).where(eq(vehiculeChauffeurs.actif, true)),
    db.select().from(historiqueProprietaires),
    db.select().from(achatsCarburant).orderBy(desc(achatsCarburant.createdAt)),
    db.select().from(gares),
    db.select().from(lignes),
    db.select().from(affectations),
  ]);

  const isGare = auth.role === "gare";

  const visibleAffectations = isGare ? allAffectations.filter((a) => a.gareId === auth.gareId) : allAffectations;

  const visibleVehicules = isGare
    ? allVehicules.filter((v) => v.gareId === auth.gareId || allAffectations.some((a) => a.gareId === auth.gareId && a.actif && a.vehiculeId === v.id))
    : allVehicules;

  const visibleDrivers = isGare ? allDrivers.filter((d) => d.gareId === auth.gareId) : allDrivers;
  const visibleOwners = isGare ? allOwners.filter((o) => o.gareId === auth.gareId) : allOwners;
  const visibleLignes = isGare ? allLignes.filter((l) => l.gareId === auth.gareId) : allLignes;

  const myDriverIds = new Set(visibleDrivers.map((d) => d.id));
  const visibleAchats = isGare ? allAchats.filter((a) => myDriverIds.has(a.chauffeurId)) : allAchats;

  res.status(200).json({
    proprietaires: visibleOwners.map(toApiOwner),
    chauffeurs: visibleDrivers.map(toApiDriver),
    vehicules: visibleVehicules.map((v) => toApiVehicule(
      v,
      junctions.filter((j) => j.vehiculeId === v.id).map((j) => j.chauffeurId),
      historiques.filter((h) => h.vehiculeId === v.id)
    )),
    carburant: visibleAchats.map((r) => toApiAchat(
      r,
      allDrivers.find((c) => c.id === r.chauffeurId),
      allVehicules.find((v) => v.id === r.vehiculeId)
    )),
    gares: allGares.map(toApiGare), // lecture ouverte aux deux rôles, comme /api/gares
    lignes: visibleLignes,
    affectations: visibleAffectations,
  });
}
