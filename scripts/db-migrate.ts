/*
 * Migraciones de la base `wishlist`. Se corren SOLO desde la Mac, por túnel SSH:
 *   ssh -N -L 5433:localhost:5432 servidor      (en otra terminal)
 *   npm run db:migrate            aplica las pendientes (drizzle/*.sql)
 *   npm run db:status             lista aplicadas y pendientes
 *   npm run db:down               revierte la ÚLTIMA migración con drizzle/down/<tag>.sql
 */
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { connectMigrate } from "./_env";

type Journal = { entries: { idx: number; tag: string }[] };
const journal = (): Journal => JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));

/** Cantidad de migraciones aplicadas según la tabla de control de drizzle (0 si aún no existe). */
async function applied(client: Awaited<ReturnType<typeof connectMigrate>>) {
  const t = await client.query("select to_regclass('drizzle.__drizzle_migrations') as t");
  if (!t.rows[0].t) return 0;
  return (await client.query("select count(*)::int as n from drizzle.__drizzle_migrations")).rows[0].n as number;
}

async function main() {
  const cmd = process.argv[2] ?? "up";
  const client = await connectMigrate();
  try {
    const entries = journal().entries;
    if (cmd === "up") {
      await migrate(drizzle(client), { migrationsFolder: "drizzle" });
      console.log(`Migraciones aplicadas: ${await applied(client)}/${entries.length}`);
    } else if (cmd === "status") {
      const n = await applied(client);
      entries.forEach((e, i) => console.log(`${i < n ? "aplicada " : "pendiente"}  ${e.tag}`));
    } else if (cmd === "down") {
      const n = await applied(client);
      if (n === 0) return console.log("No hay migraciones aplicadas.");
      const tag = entries[n - 1].tag;
      const sql = readFileSync(`drizzle/down/${tag}.sql`, "utf8");
      console.log(`Revirtiendo ${tag}:\n${sql}`);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("delete from drizzle.__drizzle_migrations where id = (select max(id) from drizzle.__drizzle_migrations)");
        await client.query("commit");
      } catch (e) {
        await client.query("rollback");
        throw e;
      }
      console.log("Revertida.");
    } else {
      throw new Error(`Comando desconocido: ${cmd}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
