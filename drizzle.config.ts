import { defineConfig } from "drizzle-kit";

/**
 * Configuración de drizzle-kit. Las migraciones se aplican SOLO desde la Mac por túnel SSH
 * (ssh -N -L 5433:localhost:5432 servidor) con MIGRATE_DATABASE_URL; nunca desde Vercel ni el build.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.MIGRATE_DATABASE_URL ?? "" },
});
