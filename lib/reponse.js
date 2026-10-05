import { gzipSync } from "node:zlib";

/* Réponse JSON compressée (gzip).
   Vercel refuse toute réponse de fonction dépassant 4,5 Mo NON compressés :
   avec plusieurs milliers de membres et véhicules, la réponse de démarrage
   (≈ 1 Ko par enregistrement) dépassait cette limite et l'application ne se
   chargeait plus. Compressée, elle est ~10 fois plus petite ; le navigateur
   la décompresse automatiquement (en-tête Content-Encoding). */
export function envoyerJson(req, res, donnees, statut = 200) {
  const corps = Buffer.from(JSON.stringify(donnees));
  const accepte = String(req.headers["accept-encoding"] || "");
  res.statusCode = statut;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Vary", "Accept-Encoding");
  if (corps.length > 1024 && /\bgzip\b/.test(accepte)) {
    const gz = gzipSync(corps, { level: 6 });
    res.setHeader("Content-Encoding", "gzip");
    res.setHeader("Content-Length", gz.length);
    return res.end(gz);
  }
  res.setHeader("Content-Length", corps.length);
  return res.end(corps);
}
