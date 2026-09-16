import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon-32.png", "apple-touch-icon.png"],
      manifest: {
        name: "COMIX-CI — Enrôlement",
        short_name: "COMIX-CI",
        description:
          "Enrôlement des transporteurs, chauffeurs et éléments, et génération de leurs cartes de membre.",
        theme_color: "#0B6E4F",
        background_color: "#FAF8F3",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "portrait",
        start_url: "/mobile", // l'APK et l'installation mobile ouvrent directement l'interface d'enrolement
        scope: "/",
        lang: "fr",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,woff2}"],
        // Le nouveau service worker prend la main immediatement au lieu
        // d'attendre la fermeture de tous les onglets : sans cela, une mise
        // a jour poussee sur Vercel n'apparaissait qu'apres plusieurs
        // rechargements, l'ancienne version restant servie depuis le cache.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Aucun appel API n'est mis en cache. La copie de secours du
        // bootstrap permettait de consulter le registre hors-ligne, mais
        // elle pouvait renvoyer des donnees vieilles de 24 heures apres un
        // deploiement ou une correction en base : un registre faux est plus
        // dangereux qu'un registre vide, et le diagnostic en devient
        // impossible. L'enrolement hors-ligne reste assure par la file
        // d'attente, qui n'a jamais dependu de ce cache.
        runtimeCaching: [],
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
});
