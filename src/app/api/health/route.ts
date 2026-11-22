import { sql } from "drizzle-orm";
import { NextResponse, connection } from "next/server";
import { withDb } from "@/db";

/** Comprueba la conexión a la base (`select 1`). No devuelve detalles de error ni secretos. */
export async function GET() {
  // Con Cache Components evita que se prerenderice en el build (consultaría la base): siempre en la petición.
  await connection();
  try {
    await withDb((db) => db.execute(sql`select 1`));
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
