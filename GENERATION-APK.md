# Générer l'APK Android à partir de la PWA COMIX-CI

L'application est une PWA installable. Pour en faire un **APK** distribuable
(installation par fichier, sans passer par le navigateur), on l'emballe dans
une **TWA** (Trusted Web Activity) : une coquille Android qui affiche la PWA
en plein écran, sans barre d'adresse.

L'APK reste **connecté au site** : chaque mise à jour poussée sur Vercel est
immédiatement visible dans l'application, sans réinstaller l'APK. Il n'y a
donc pas à régénérer l'APK à chaque évolution — seulement si l'icône, le nom
ou l'URL changent.

---

## Prérequis — déjà en place

| Élément | État |
|---|---|
| Servi en HTTPS | ✅ `mugetranci-j82u.vercel.app` |
| `manifest.webmanifest` complet | ✅ nom, `start_url`, `display: standalone`, `theme_color` |
| Icônes 192 / 512 / maskable | ✅ dans `public/` |
| Service worker (hors-ligne) | ✅ généré par `vite-plugin-pwa` |
| `/.well-known/assetlinks.json` | ✅ renseigné (package `com.comix_ci.mobile.twa`) |

---

## Méthode recommandée : PWABuilder (aucune installation)

Le plus rapide. Microsoft compile l'APK dans le cloud et le signe.

1. Ouvrir **https://www.pwabuilder.com**
2. Saisir l'URL : `https://mugetranci-j82u.vercel.app`
3. Lancer l'analyse — les voyants Manifest / Service Worker / HTTPS doivent
   être au vert
4. Cliquer **Package for stores** → **Android** → **Generate Package**
5. Renseigner :
   - **Package ID** : `ci.comixci.enrolement`
   - **App name** : `COMIX-CI — Enrôlement`
   - **Short name** : `COMIX-CI`
   - **Signing key** : *Create new* (garder le fichier `.keystore` et son
     mot de passe **précieusement** — sans lui, impossible de publier une
     mise à jour de l'APK plus tard)
6. Télécharger le `.zip` : il contient l'APK, l'AAB (pour le Play Store) et
   un fichier `assetlinks.json` prêt à l'emploi

---

## Étape 3 — Supprimer la barre d'adresse

Sans cette étape, l'application s'ouvre avec une barre d'URL en haut.

1. Dans le zip téléchargé, ouvrir `assetlinks.json` et copier la valeur de
   `sha256_cert_fingerprints`
2. Coller cette empreinte dans le fichier du projet :
   `public/.well-known/assetlinks.json`, à la place de
   `REMPLACER_PAR_EMPREINTE_SHA256_DU_KEYSTORE`
3. Pousser et laisser Vercel redéployer
4. Vérifier que `https://mugetranci-j82u.vercel.app/.well-known/assetlinks.json`
   renvoie bien le fichier
5. Désinstaller puis réinstaller l'APK — la barre d'adresse disparaît

---

## Méthode alternative : Bubblewrap (en local)

À utiliser si vous préférez tout maîtriser sur votre poste.

Prérequis : **JDK 17+** et le **SDK Android** (via Android Studio).

```powershell
npm install -g @bubblewrap/cli

bubblewrap init --manifest https://mugetranci-j82u.vercel.app/manifest.webmanifest
# Package ID : ci.comixci.enrolement

bubblewrap build
# Produit app-release-signed.apk
```

Récupérer ensuite l'empreinte pour l'étape 3 :

```powershell
bubblewrap fingerprint list
```

---

## Distribution

- **Diffusion directe** : envoyer l'APK aux agents (WhatsApp, clé USB, lien).
  Ils doivent autoriser « Installer des applications inconnues » sur leur
  téléphone. C'est la voie la plus simple pour un déploiement interne.
- **Play Store** : utiliser le fichier `.aab` du zip. Compte développeur
  Google requis (25 $ une fois), plus quelques jours de validation.

---

## Points d'attention

- **Conserver le keystore.** Perdu, il devient impossible de publier une mise
  à jour de l'APK : il faudrait republier sous un autre identifiant, et les
  agents devraient tout réinstaller.
- **L'appareil photo exige HTTPS** — satisfait via Vercel, mais ne fonctionnera
  pas si l'APK pointe un jour vers une adresse en `http://`.
- **Le mode hors-ligne** fonctionne dans l'APK exactement comme dans le
  navigateur : les enrôlements réalisés sans réseau partent automatiquement
  au retour de la connexion.
