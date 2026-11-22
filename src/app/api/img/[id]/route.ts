import { eq } from "drizzle-orm";
import { NextResponse, connection } from "next/server";
import { withDb } from "@/db";
import { itemImages } from "@/db/schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Sirve una foto guardada en la base. El id es un UUID aleatorio y la foto nunca cambia: caché larga. */
export async function GET(_req: Request, ctx: RouteContext<"/api/img/[id]">) {
  // Con Cache Components evita que se prerenderice en el build (consultaría la base): siempre en la petición.
  await connection();
  const { id } = await ctx.params;
  if (!UUID.test(id)) return new NextResponse("No encontrada", { status: 404 });
  try {
    const [row] = await withDb((db) => db.select().from(itemImages).where(eq(itemImages.id, id)));
    if (!row) return new NextResponse("No encontrada", { status: 404 });
    return new NextResponse(new Uint8Array(row.data), {
      headers: { "content-type": row.contentType, "cache-control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new NextResponse("Error al leer la foto", { status: 502 });
  }
}
