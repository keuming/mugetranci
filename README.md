# MUGETRAN-CI — Mutuelle Nationale des Transporteurs de Côte d'Ivoire

Application web (dashboard) de gestion du registre unifié **véhicule / propriétaire / chauffeur**
pour une mutuelle de transporteurs en Côte d'Ivoire.

## Fonctionnalités (v0 — prototype front-end)

- Fiche véhicule commercial : marque, modèle, châssis, carte grise, immatriculation, date de
  1ère mise en circulation, photo.
- Suivi des dates de fin de validité des documents administratifs (visite technique, assurance
  auto, vignette, carte de stationnement) + permis de conduire au niveau du chauffeur.
- Alertes automatiques (à jour / échéance ≤ 30 jours / expiré) agrégées sur un tableau de bord.
- Fiche Propriétaire (nom, CNI, 3 contacts, email, ville, quartier, photo) avec historique en cas
  de changement de propriétaire.
- Fiche Chauffeur (nom, CNI, permis, 3 contacts, email, photo) — plusieurs chauffeurs par véhicule.
- Génération de la Fiche Véhicule Commercial imprimable (3 sections : véhicule / propriétaire /
  chauffeur(s)).
- Carte de membre chauffeur (recto : photo, nom, immatriculation, contacts, QR encaissement
  MobilePay — verso : QR pointage carburant station).

> Les QR codes affichés sont des mockups visuels (motif déterministe, non scannables). Ils seront
> remplacés par un vrai générateur QR (`qrcode`) une fois le backend branché.

## Stack

React 18 + Vite + Tailwind CSS + lucide-react côté front. API REST via fonctions serverless
Vercel (`api/*.js`) + Drizzle ORM + Neon PostgreSQL côté back.

## Base de données

```bash
cp .env.example .env.local        # puis renseignez DATABASE_URL (Neon)
npm run db:generate                # génère la migration SQL à partir du schéma
npm run db:migrate                 # applique la migration sur Neon
npm run db:seed                    # (optionnel) insère des données de démonstration
npm run db:studio                  # (optionnel) explorateur visuel des tables
```

## Développement local

Le frontend seul (sans API) :
```bash
npm install
npm run dev
```

Avec l'API (`/api/*`) en local, utilisez la CLI Vercel plutôt que `vite` seul, car
`npm run dev` ne sert pas les fonctions serverless :
```bash
npm install -g vercel   # une seule fois
vercel dev
```

## Déploiement

Projet Vite + fonctions serverless, déployable tel quel sur Vercel. Pensez à ajouter
`DATABASE_URL` dans Vercel → Settings → Environment Variables (Production + Preview).
