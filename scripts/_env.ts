import { readFileSync } from "node:fs";
import { Client } from "pg";

/** Carga `.env.local` (si existe) en process.env sin pisar variables ya definidas. */
export function loadEnv() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // Sin .env.local: se usan solo las variables del entorno.
  }
}

/**
 * Abre una conexión `pg` por el túnel SSH usando MIGRATE_DATABASE_URL (nunca DATABASE_URL).
 * @returns Cliente conectado; quien llama debe cerrarlo con `end()`.
 */
export async function connectMigrate(): Promise<Client> {
  loadEnv();
  const url = process.env.MIGRATE_DATABASE_URL;
  if (!url) throw new Error("Falta MIGRATE_DATABASE_URL (túnel: ssh -N -L 5433:localhost:5432 servidor)");
  const client = new Client({ connectionString: url, statement_timeout: 15000 });
  await client.connect();
  return client;
}
