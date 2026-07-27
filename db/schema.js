import {
  pgTable, uuid, varchar, text, date, timestamp, boolean, integer, numeric,
} from "drizzle-orm/pg-core";

/* ---------- Propriétaires ---------- */
export const proprietaires = pgTable("proprietaires", {
  id: uuid("id").defaultRandom().primaryKey(),
  nom: varchar("nom", { length: 120 }).notNull(),
  prenoms: varchar("prenoms", { length: 120 }).notNull(),
  cni: varchar("cni", { length: 40 }).notNull(),
  carteTransporteurNumero: varchar("carte_transporteur_numero", { length: 60 }),
  numeroPermis: varchar("numero_permis", { length: 60 }),
  contact1: varchar("contact1", { length: 30 }),
  contact2: varchar("contact2", { length: 30 }),
  contact3: varchar("contact3", { length: 30 }),
  email: varchar("email", { length: 160 }),
  ville: varchar("ville", { length: 80 }),
  quartier: varchar("quartier", { length: 120 }),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------- Chauffeurs ---------- */
export const chauffeurs = pgTable("chauffeurs", {
  id: uuid("id").defaultRandom().primaryKey(),
  nom: varchar("nom", { length: 120 }).notNull(),
  prenoms: varchar("prenoms", { length: 120 }).notNull(),
  cni: varchar("cni", { length: 40 }).notNull(),
  permisNumero: varchar("permis_numero", { length: 60 }).notNull(),
  permisDateFin: date("permis_date_fin").notNull(),
  contact1: varchar("contact1", { length: 30 }),
  contact2: varchar("contact2", { length: 30 }),
  contact3: varchar("contact3", { length: 30 }),
  email: varchar("email", { length: 160 }),
  photoUrl: text("photo_url"),
  // QR code de paiement Mobile Money : image générée par le wallet du
  // chauffeur (ex. application MobilePay), importée telle quelle — ce n'est
  // pas un QR généré par notre application.
  qrPaiementUrl: text("qr_paiement_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------- Véhicules ---------- */
export const vehicules = pgTable("vehicules", {
  id: uuid("id").defaultRandom().primaryKey(),
  marque: varchar("marque", { length: 80 }).notNull(),
  modele: varchar("modele", { length: 120 }).notNull(),
  chassis: varchar("chassis", { length: 60 }).notNull().unique(),
  carteGrise: varchar("carte_grise", { length: 60 }),
  nomCarteGrise: varchar("nom_carte_grise", { length: 160 }), // titulaire inscrit sur la carte grise (peut différer du propriétaire actuel)
  immatriculation: varchar("immatriculation", { length: 30 }).notNull().unique(),
  dateMiseCirculation: date("date_mise_circulation"),
  photoUrl: text("photo_url"),

  // documents administratifs du véhicule — dates de fin de validité
  visiteTechniqueDateFin: date("visite_technique_date_fin"),
  assuranceAutoDateFin: date("assurance_auto_date_fin"),
  vignetteDateFin: date("vignette_date_fin"),
  carteStationnementDateFin: date("carte_stationnement_date_fin"),

  proprietaireId: uuid("proprietaire_id").references(() => proprietaires.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------- Historique des propriétaires (traçabilité en cas de revente) ---------- */
export const historiqueProprietaires = pgTable("historique_proprietaires", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehiculeId: uuid("vehicule_id").references(() => vehicules.id).notNull(),
  proprietaireId: uuid("proprietaire_id").references(() => proprietaires.id).notNull(),
  depuis: date("depuis").notNull(),
  jusquA: date("jusqu_a"), // null = propriétaire actuel
});

/* ---------- Liaison véhicule <-> chauffeur(s) (plusieurs chauffeurs/véhicule) ---------- */
export const vehiculeChauffeurs = pgTable("vehicule_chauffeurs", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehiculeId: uuid("vehicule_id").references(() => vehicules.id).notNull(),
  chauffeurId: uuid("chauffeur_id").references(() => chauffeurs.id).notNull(),
  actif: boolean("actif").default(true).notNull(),
  depuis: date("depuis").defaultNow(),
});

/* ---------- Achats de carburant (pointage station) ----------
   Créé lors du scan du QR verso de la carte de membre (ID carte +
   numéro de carte grise) : le pompiste saisit ensuite le volume et le
   montant sur l'application mobile. Une commission de la mutuelle est
   calculée automatiquement sur chaque transaction. */
export const achatsCarburant = pgTable("achats_carburant", {
  id: uuid("id").defaultRandom().primaryKey(),
  chauffeurId: uuid("chauffeur_id").references(() => chauffeurs.id).notNull(),
  vehiculeId: uuid("vehicule_id").references(() => vehicules.id),
  carteGrise: varchar("carte_grise", { length: 60 }).notNull(), // dénormalisé : lu depuis le QR au scan
  volumeLitres: numeric("volume_litres", { precision: 8, scale: 2 }).notNull(),
  montantFcfa: integer("montant_fcfa").notNull(),
  commissionFcfa: integer("commission_fcfa").notNull(),
  station: varchar("station", { length: 160 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
