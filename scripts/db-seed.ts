/*
 * Datos de DEMO para desarrollo local (no son datos reales). Todos los nombres empiezan con «[DEMO]».
 *   npm run db:seed            inserta las tarjetas de ejemplo
 *   npm run db:seed -- clean   quita solo las tarjetas «[DEMO]»
 */
import { connectMigrate } from "./_env";

const DEMO = [
  { space: "cris", category: "articulo", style: "polaroid", name: "[DEMO] Audífonos", price: 250000, x: 120, y: 260 },
  { space: "cris", category: "cine", style: "boleta", name: "[DEMO] Dune 3", price: null, x: 420, y: 280 },
  { space: "shared", category: "viaje", style: "correo", name: "[DEMO] Cartagena", price: 1800000, x: 220, y: 260 },
  { space: "melck", category: "nota", style: "postit", name: "[DEMO] Idea suelta", price: null, x: 300, y: 300 },
];

async function main() {
  const client = await connectMigrate();
  try {
    if (process.argv[2] === "clean") {
      const r = await client.query("delete from items where name like '[DEMO]%'");
      return console.log(`Quitadas ${r.rowCount} tarjetas de demo.`);
    }
    for (const d of DEMO) {
      await client.query(
        "insert into items (space, category, style, name, price, currency, x, y, created_by) values ($1,$2,$3,$4,$5,'COP',$6,$7,'cris')",
        [d.space, d.category, d.style, d.name, d.price, d.x, d.y],
      );
    }
    console.log(`Insertadas ${DEMO.length} tarjetas de demo.`);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
