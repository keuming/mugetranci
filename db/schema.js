import {
  pgTable, uuid, varchar, text, date, timestamp, boolean, integer, numeric,
} from "drizzle-orm/pg-core";

/* ---------- Commissions Mixtes (COMIX-CI) ----------
   Une commission mixte est reconnue par les autorités communales et
   regroupe plusieurs syndicats de transporteurs de sa commune. Compte
   créé par l'administrateur général — accès en lecture sur ses syndicats
   et leurs membres, ne gère pas directement les membres. */
export const commissionsMixtes = pgTable("commissions_mixtes", {
  id: uuid("id").defaultRandom().primaryKey(),
  nom: varchar("nom", { length: 160 }).notNull(),
  sigle: varchar("sigle", { length: 20 }),
  logoUrl: text("logo_url"),
  commune: varchar("commune", { length: 120 }).notNull(),
  localisation: varchar("localisation", { length: 255 }),
  latitude: numeric("latitude", { precision: 10, scale: 6 }),
  longitude: numeric("longitude", { precision: 10, scale: 6 }),
  presidentNom: varchar("president_nom", { length: 160 }),
  presidentContact: varchar("president_contact", { length: 30 }),
  login: varchar("login", { length: 20 }).unique(),
  pinCode: varchar("pin_code", { length: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------- Syndicats ----------
   Rattaché à une commission mixte. Compte créé par l'administrateur
   général ou par la commission mixte elle-même, géré au quotidien par le
   syndicat (gestion de ses propres membres, chauffeurs, véhicules, gares
   routières). */
export const syndicats = pgTable("syndicats", {
  id: uuid("id").defaultRandom().primaryKey(),
  commissionMixteId: uuid("commission_mixte_id").references(() => commissionsMixtes.id).notNull(),
  nom: varchar("nom", { length: 160 }).notNull(),
  sigle: varchar("sigle", { length: 20 }),
  logoUrl: text("logo_url"),
  presidentNom: varchar("president_nom", { length: 160 }),
  presidentContact: varchar("president_contact", { length: 30 }),
  login: varchar("login", { length: 20 }).unique(),
  pinCode: varchar("pin_code", { length: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  syndicatId: uuid("syndicat_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------- Chauffeurs (membres des syndicats) ---------- */
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
  qrPaiementUrl: text("qr_paiement_url"),
  syndicatId: uuid("syndicat_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------- Véhicules ---------- */
export const vehicules = pgTable("vehicules", {
  id: uuid("id").defaultRandom().primaryKey(),
  marque: varchar("marque", { length: 80 }).notNull(),
  modele: varchar("modele", { length: 120 }).notNull(),
  chassis: varchar("chassis", { length: 60 }).notNull().unique(),
  carteGrise: varchar("carte_grise", { length: 60 }),
  nomCarteGrise: varchar("nom_carte_grise", { length: 160 }),
  categorie: varchar("categorie", { length: 40 }), // VTC, Minibus, Taxi brousse, Taxi compteur…
  immatriculation: varchar("immatriculation", { length: 30 }).notNull().unique(),
  dateMiseCirculation: date("date_mise_circulation"),
  photoUrl: text("photo_url"),
  visiteTechniqueDateFin: date("visite_technique_date_fin"),
  assuranceAutoDateFin: date("assurance_auto_date_fin"),
  vignetteDateFin: date("vignette_date_fin"),
  carteStationnementDateFin: date("carte_stationnement_date_fin"),
  proprietaireId: uuid("proprietaire_id").references(() => proprietaires.id),
  syndicatId: uuid("syndicat_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------- Historique des propriétaires ---------- */
export const historiqueProprietaires = pgTable("historique_proprietaires", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehiculeId: uuid("vehicule_id").references(() => vehicules.id).notNull(),
  proprietaireId: uuid("proprietaire_id").references(() => proprietaires.id).notNull(),
  depuis: date("depuis").notNull(),
  jusquA: date("jusqu_a"),
});

/* ---------- Liaison véhicule <-> chauffeur(s) ---------- */
export const vehiculeChauffeurs = pgTable("vehicule_chauffeurs", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehiculeId: uuid("vehicule_id").references(() => vehicules.id).notNull(),
  chauffeurId: uuid("chauffeur_id").references(() => chauffeurs.id).notNull(),
  actif: boolean("actif").default(true).notNull(),
  depuis: date("depuis").defaultNow(),
});

/* ---------- Achats de carburant ---------- */
export const achatsCarburant = pgTable("achats_carburant", {
  id: uuid("id").defaultRandom().primaryKey(),
  chauffeurId: uuid("chauffeur_id").references(() => chauffeurs.id).notNull(),
  vehiculeId: uuid("vehicule_id").references(() => vehicules.id),
  carteGrise: varchar("carte_grise", { length: 60 }).notNull(),
  volumeLitres: numeric("volume_litres", { precision: 8, scale: 2 }).notNull(),
  montantFcfa: integer("montant_fcfa").notNull(),
  commissionFcfa: integer("commission_fcfa").notNull(),
  station: varchar("station", { length: 160 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------- Lignes (trajets) rattachées à une commission mixte ---------- */
export const lignes = pgTable("lignes", {
  id: uuid("id").defaultRandom().primaryKey(),
  commissionMixteId: uuid("commission_mixte_id").references(() => commissionsMixtes.id).notNull(),
  lieuDepart: varchar("lieu_depart", { length: 160 }).notNull(),
  lieuArrivee: varchar("lieu_arrivee", { length: 160 }).notNull(),
  cout: integer("cout").notNull(),
  chefNom: varchar("chef_nom", { length: 160 }),
  chefContact: varchar("chef_contact", { length: 30 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------- Affectation d'un véhicule à une commission mixte / ligne ---------- */
/* ---------- Gares routières ----------
   Lieu physique où le véhicule opère (distinct de la commission mixte,
   organe administratif). Créée par le syndicat lui-même. Compte de
   connexion optionnel (login/PIN) pour un futur accès dédié. */
export const garesRoutieres = pgTable("gares_routieres", {
  id: uuid("id").defaultRandom().primaryKey(),
  syndicatId: uuid("syndicat_id").references(() => syndicats.id).notNull(),
  nom: varchar("nom", { length: 160 }).notNull(),
  sigle: varchar("sigle", { length: 20 }),
  logoUrl: text("logo_url"),
  login: varchar("login", { length: 20 }).unique(),
  pinCode: varchar("pin_code", { length: 4 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const affectations = pgTable("affectations", {
  id: uuid("id").defaultRandom().primaryKey(),
  vehiculeId: uuid("vehicule_id").references(() => vehicules.id).notNull(),
  commissionMixteId: uuid("commission_mixte_id").references(() => commissionsMixtes.id).notNull(),
  ligneId: uuid("ligne_id").references(() => lignes.id).notNull(),
  gareRoutiere: varchar("gare_routiere", { length: 160 }), // ancien champ libre — conservé pour compatibilité
  gareRoutiereId: uuid("gare_routiere_id").references(() => garesRoutieres.id), // gare routière (lieu physique) où le véhicule opère
  dateAffectation: date("date_affectation").notNull(),
  dateFin: date("date_fin"),
  actif: boolean("actif").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
