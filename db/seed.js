// Insère des données de démonstration réelles dans la base Neon.
// Usage : npm run db:seed   (nécessite DATABASE_URL dans .env.local)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "./index.js";
import { proprietaires, chauffeurs, vehicules, historiqueProprietaires, vehiculeChauffeurs } from "./schema.js";

async function seed() {
  console.log("Insertion des propriétaires…");
  const [p1, p2, p3] = await db.insert(proprietaires).values([
    { nom: "Koffi", prenoms: "Amara Jean", cni: "CI004821035", contact1: "07 08 12 34 56", contact2: "01 02 45 67 89", email: "amara.koffi@gmail.com", ville: "Abidjan", quartier: "Yopougon Niangon" },
    { nom: "Diaby", prenoms: "Fatoumata", cni: "CI009274611", contact1: "05 55 21 09 87", email: "f.diaby@yahoo.fr", ville: "Abidjan", quartier: "Marcory Zone 4" },
    { nom: "N'Guessan", prenoms: "Roland Kouadio", cni: "CI007113390", contact1: "01 45 78 12 03", contact2: "07 90 33 21 44", email: "rk.nguessan@outlook.com", ville: "Bingerville", quartier: "Centre-ville" },
  ]).returning();

  console.log("Insertion des chauffeurs…");
  const [c1, c2, c3, c4] = await db.insert(chauffeurs).values([
    { nom: "Traoré", prenoms: "Ibrahim", cni: "CI002238841", permisNumero: "PC-CI-118820", permisDateFin: "2026-08-14", contact1: "01 23 45 67 89", contact2: "07 11 22 33 44" },
    { nom: "Bamba", prenoms: "Souleymane", cni: "CI005567123", permisNumero: "PC-CI-095512", permisDateFin: "2027-03-02", contact1: "05 90 88 12 10" },
    { nom: "Yao", prenoms: "Marie-Claire", cni: "CI001129887", permisNumero: "PC-CI-204471", permisDateFin: "2026-11-20", contact1: "07 44 55 66 77", email: "yao.mclaire@gmail.com" },
    { nom: "Kouassi", prenoms: "Didier", cni: "CI008812204", permisNumero: "PC-CI-330198", permisDateFin: "2026-08-02", contact1: "05 12 34 56 78" },
  ]).returning();

  console.log("Insertion des véhicules…");
  const [v1] = await db.insert(vehicules).values({
    marque: "Toyota", modele: "Hiace (18 places)", chassis: "JT731HB0900123456", carteGrise: "CG-2021-004821",
    immatriculation: "CI 1234 AB 01", dateMiseCirculation: "2021-03-12",
    visiteTechniqueDateFin: "2026-08-05", assuranceAutoDateFin: "2026-12-01", vignetteDateFin: "2026-07-10", carteStationnementDateFin: "2026-09-20",
    proprietaireId: p1.id,
  }).returning();

  const [v2] = await db.insert(vehicules).values({
    marque: "Nissan", modele: "Urvan (15 places)", chassis: "JN1TBNC26Z0098741", carteGrise: "CG-2022-009274",
    immatriculation: "CI 5678 CD 02", dateMiseCirculation: "2022-06-01",
    visiteTechniqueDateFin: "2027-01-18", assuranceAutoDateFin: "2027-02-11", vignetteDateFin: "2027-01-05", carteStationnementDateFin: "2026-08-15",
    proprietaireId: p2.id,
  }).returning();

  const [v3] = await db.insert(vehicules).values({
    marque: "Toyota", modele: "Corolla (taxi compteur)", chassis: "JTDBR32E720045678", carteGrise: "CG-2019-007113",
    immatriculation: "CI 9012 EF 01", dateMiseCirculation: "2019-11-27",
    visiteTechniqueDateFin: "2026-07-01", assuranceAutoDateFin: "2026-08-09", vignetteDateFin: "2027-01-05", carteStationnementDateFin: "2026-08-01",
    proprietaireId: p3.id,
  }).returning();

  console.log("Historique propriétaires et liaisons chauffeurs…");
  await db.insert(historiqueProprietaires).values([
    { vehiculeId: v1.id, proprietaireId: p1.id, depuis: "2021-03-12" },
    { vehiculeId: v2.id, proprietaireId: p2.id, depuis: "2022-06-01" },
    { vehiculeId: v3.id, proprietaireId: p1.id, depuis: "2019-11-27", jusquA: "2025-02-09" },
    { vehiculeId: v3.id, proprietaireId: p3.id, depuis: "2025-02-10" },
  ]);

  await db.insert(vehiculeChauffeurs).values([
    { vehiculeId: v1.id, chauffeurId: c1.id },
    { vehiculeId: v1.id, chauffeurId: c2.id },
    { vehiculeId: v2.id, chauffeurId: c3.id },
    { vehiculeId: v3.id, chauffeurId: c4.id },
  ]);

  console.log("✓ Données de démonstration insérées.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Erreur lors du seed :", err);
  process.exit(1);
});
