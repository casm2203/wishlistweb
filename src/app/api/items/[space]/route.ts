import { NextResponse, connection } from "next/server";
import { withDb } from "@/db";
import { listItems } from "@/db/items";
import type { Space } from "@/lib/types";

/** Lista pública (solo lectura) de los artículos de un espacio; el tablero la consulta cada pocos segundos. */
export async function GET(_req: Request, ctx: RouteContext<"/api/items/[space]">) {
  // Con Cache Components evita que se prerenderice en el build (consultaría la base): siempre en la petición.
  await connection();
  const { space } = await ctx.params;
  if (!["cris", "melck", "shared"].includes(space)) return NextResponse.json({ error: "Espacio inválido" }, { status: 404 });
  try {
    const list = await withDb((db) => listItems(db, space as Space));
    return NextResponse.json(list, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "No se pudo leer" }, { status: 502 });
  }
}
