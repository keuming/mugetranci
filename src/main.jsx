import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

/* Quand un nouveau service worker prend le controle, on recharge une fois
   la page pour que la version fraiche s'applique tout de suite. Sans cela,
   l'onglet continuait d'afficher l'ancienne version servie depuis le cache
   apres un deploiement. Le drapeau evite toute boucle de rechargement. */
if ("serviceWorker" in navigator) {
  let dejaRecharge = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (dejaRecharge) return;
    dejaRecharge = true;
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
