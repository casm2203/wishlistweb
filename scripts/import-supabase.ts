/*
 * Importación ÚNICA de los datos de Supabase a la base `wishlist` (por túnel SSH).
 * Lee `items` con la clave publishable (la lectura pública está permitida), descarga las fotos del bucket
 * público y las guarda como bytea. Conserva ids y fechas; es idempotente (salta los ids ya importados).
 *   npm run db:import-supabase            importa
 *   npm run db:import-supabase -- dry     solo cuenta, no escribe
 */
import { connectMigrate, loadEnv } from "./_env";

type Row = Record<string, unknown> & { id: string; image_url: string | null };

async function main() {
  loadEnv();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local");
  const dry = process.argv[2] === "dry";

  const res = await fetch(`${base}/rest/v1/items?select=*&order=created_at`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Supabase respondió ${res.status}`);
  const rows = (await res.json()) as Row[];
  console.log(`Items en Supabase: ${rows.length} (${rows.filter((r) => r.image_url).length} con foto)`);
  if (dry) return;

  const client = await connectMigrate();
  const cols = [
    "id", "space", "category", "name", "description", "price", "currency", "url", "needs_locker", "kind", "status",
    "x", "y", "rotation", "style", "paper", "ink", "holder", "holder_color", "bg", "emoji", "code", "scale", "z",
    "created_at", "updated_at",
  ];
  let inserted = 0;
  let skipped = 0;
  try {
    for (const r of rows) {
      const exists = await client.query("select 1 from items where id = $1", [r.id]);
      if (exists.rowCount) {
        skipped++;
        continue;
      }
      let imageId: string | null = null;
      if (r.image_url) {
        const img = await fetch(r.image_url);
        if (!img.ok) throw new Error(`No se pudo descargar la foto de ${r.id} (${img.status})`);
        const type = img.headers.get("content-type") ?? "image/jpeg";
        const out = await client.query("insert into item_images (data, content_type) values ($1,$2) returning id", [
          Buffer.from(await img.arrayBuffer()),
          type,
        ]);
        imageId = out.rows[0].id;
      }
      // created_by en Supabase era un uuid de auth.users: aquí se desconoce el dueño real, queda null.
      const values = [...cols.map((c) => r[c] ?? null), imageId];
      await client.query(
        `insert into items (${cols.join(",")}, image_id) values (${values.map((_, i) => `$${i + 1}`).join(",")})`,
        values,
      );
      inserted++;
    }
  } finally {
    await client.end();
  }
  console.log(`Importados: ${inserted}, ya existentes: ${skipped}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
