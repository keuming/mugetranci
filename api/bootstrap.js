import { eq, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  proprietaires, chauffeurs, vehicules, historiqueProprietaires, vehiculeChauffeurs,
  achatsCarburant, commissionsMixtes, syndicats, garesRoutieres, lignes, affectations,
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
function toApiCommission(row) {
  const { pinCode, ...rest } = row;
  return {
    ...rest,
    latitude: row.latitude !== null ? Number(row.latitude) : null,
    longitude: row.longitude !== null ? Number(row.longitude) : null,
    pinConfigure: !!pinCode,
  };
}
function toApiSyndicat(row) {
  const { pinCode, ...rest } = row;
  return { ...rest, pinConfigure: !!pinCode };
}
function toApiGareRoutiere(row) {
  const { pinCode, ...rest } = row;
  return { ...rest, pinConfigure: !!pinCode };
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

  const [
    allOwners, allDrivers, allVehicules, junctions, historiques,
    allAchats, allCommissions, allSyndicats, allGares, allLignes, allAffectations,
  ] = await Promise.all([
    db.select().from(proprietaires),
    db.select().from(chauffeurs),
    db.select().from(vehicules),
    db.select().from(vehiculeChauffeurs).where(eq(vehiculeChauffeurs.actif, true)),
    db.select().from(historiqueProprietaires),
    db.select().from(achatsCarburant).orderBy(desc(achatsCarburant.createdAt)),
    db.select().from(commissionsMixtes),
    db.select().from(syndicats),
    db.select().from(garesRoutieres),
    db.select().from(lignes),
    db.select().from(affectations),
  ]);

  const isSyndicat = auth.role === "syndicat";
  const isCommission = auth.role === "commission_mixte";
  const isGare = auth.role === "gare";

  const mySyndicatIds = isCommission
    ? new Set(allSyndicats.filter((s) => s.commissionMixteId === auth.commissionMixteId).map((s) => s.id))
    : null;

  const visibleSyndicats = isCommission
    ? allSyndicats.filter((s) => mySyndicatIds.has(s.id))
    : isSyndicat
      ? allSyndicats.filter((s) => s.id === auth.syndicatId)
      : allSyndicats;

  const visibleOwners = isSyndicat
    ? allOwners.filter((o) => o.syndicatId === auth.syndicatId)
    : isCommission
      ? allOwners.filter((o) => mySyndicatIds.has(o.syndicatId))
      : isGare
        ? []
        : allOwners;

  const visibleDrivers = isSyndicat
    ? allDrivers.filter((d) => d.syndicatId === auth.syndicatId)
    : isCommission
      ? allDrivers.filter((d) => mySyndicatIds.has(d.syndicatId))
      : isGare
        ? []
        : allDrivers;

  const visibleAffectations = isCommission
    ? allAffectations.filter((a) => a.commissionMixteId === auth.commissionMixteId)
    : isGare
      ? allAffectations.filter((a) => a.gareRoutiereId === auth.gareRoutiereId)
      : allAffectations;

  const visibleVehicules = isSyndicat
    ? allVehicules.filter((v) => v.syndicatId === auth.syndicatId)
    : isCommission
      ? allVehicules.filter((v) => mySyndicatIds.has(v.syndicatId) || visibleAffectations.some((a) => a.actif && a.vehiculeId === v.id))
      : isGare
        ? allVehicules.filter((v) => visibleAffectations.some((a) => a.actif && a.vehiculeId === v.id))
        : allVehicules;

  const visibleLignes = isCommission
    ? allLignes.filter((l) => {
        const gare = allGares.find((g) => g.id === l.gareRoutiereId);
        return gare && mySyndicatIds.has(gare.syndicatId);
      })
    : isSyndicat
      ? allLignes.filter((l) => {
          const gare = allGares.find((g) => g.id === l.gareRoutiereId);
          return gare && gare.syndicatId === auth.syndicatId;
        })
      : isGare
        ? allLignes.filter((l) => l.gareRoutiereId === auth.gareRoutiereId)
        : allLignes;

  const visibleGares = isSyndicat
    ? allGares.filter((g) => g.syndicatId === auth.syndicatId)
    : isGare
      ? allGares.filter((g) => g.id === auth.gareRoutiereId)
      : allGares;

  const visibleDriverIds = new Set(visibleDrivers.map((d) => d.id));
  const visibleAchats = (isSyndicat || isCommission) ? allAchats.filter((a) => visibleDriverIds.has(a.chauffeurId)) : isGare ? [] : allAchats;

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
    commissionsMixtes: allCommissions.map(toApiCommission), // lecture ouverte à tous les rôles authentifiés
    syndicats: visibleSyndicats.map(toApiSyndicat),
    garesRoutieres: visibleGares.map(toApiGareRoutiere),
    lignes: visibleLignes,
    affectations: visibleAffectations,
  });
}
