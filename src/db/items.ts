import { and, asc, eq, ne, or, sql } from "drizzle-orm";
import type { Db } from "./index";
import { itemImages, items } from "./schema";
import type { Item, Owner, Space } from "@/lib/types";

type Row = typeof items.$inferSelect;

/** Convierte una fila de la base en el `Item` que usa la UI (price numérico, fechas ISO, image_url pública). */
export function toItem(r: Row): Item {
  return {
    id: r.id,
    space: r.space as Item["space"],
    category: r.category as Item["category"],
    name: r.name,
    description: r.description,
    price: r.price === null ? null : Number(r.price),
    currency: r.currency,
    url: r.url,
    image_url: r.imageId ? `/api/img/${r.imageId}` : null,
    needs_locker: r.needsLocker,
    kind: r.kind as Item["kind"],
    status: r.status as Item["status"],
    x: r.x,
    y: r.y,
    rotation: r.rotation,
    style: r.style as Item["style"],
    paper: r.paper,
    ink: r.ink,
    holder: r.holder as Item["holder"],
    holder_color: r.holderColor,
    bg: r.bg,
    emoji: r.emoji,
    code: r.code,
    scale: r.scale,
    z: r.z,
    created_by: r.createdBy,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}

/** Condición «este usuario puede escribir en la fila»: su espacio o el compartido (reemplaza la RLS). */
export const writable = (owner: Owner) => or(eq(items.space, "shared"), eq(items.space, owner))!;

/** Artículos de un espacio, del más viejo al más nuevo. */
export async function listItems(db: Db, space: Space): Promise<Item[]> {
  const rows = await db.select().from(items).where(eq(items.space, space)).orderBy(asc(items.createdAt));
  return rows.map(toItem);
}

/** Guarda una foto y devuelve su id. */
export async function insertImage(db: Db, data: Buffer, contentType: string): Promise<string> {
  const [row] = await db.insert(itemImages).values({ data, contentType }).returning({ id: itemImages.id });
  return row.id;
}

/** Borra una foto si ya no la usa ningún artículo. */
export async function dropImageIfOrphan(db: Db, imageId: string | null | undefined) {
  if (!imageId) return;
  await db.delete(itemImages).where(
    and(eq(itemImages.id, imageId), sql`not exists (select 1 from ${items} where ${items.imageId} = ${imageId})`),
  );
}

/**
 * Alterna pending <-> reserved en un artículo del tablero AJENO (nunca el propio ni el compartido).
 * Reemplaza la función SQL `reserve_item` de Supabase; es una sola sentencia atómica.
 * @returns El artículo actualizado o null si cambió el estado / no corresponde.
 */
export async function reserveItem(db: Db, id: string, reserve: boolean, owner: Owner): Promise<Item | null> {
  const [row] = await db
    .update(items)
    .set({ status: reserve ? "reserved" : "pending" })
    .where(
      and(
        eq(items.id, id),
        ne(items.space, "shared"),
        ne(items.space, owner),
        eq(items.status, reserve ? "pending" : "reserved"),
      ),
    )
    .returning();
  return row ? toItem(row) : null;
}
