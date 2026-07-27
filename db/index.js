import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import * as schema from "./schema.js";

// En local (node db/seed.js, drizzle-kit, etc.), .env.local n'est pas chargé
// automatiquement. En production sur Vercel, ce fichier n'existe pas et
// DATABASE_URL est déjà injectée : dotenv.config() ne fait alors rien.
dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL manquante. Ajoutez-la dans .env.local (dev) ou dans Vercel → Settings → Environment Variables (prod)."
  );
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
