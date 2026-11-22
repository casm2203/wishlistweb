"use server";

import { and, eq } from "drizzle-orm";
import { dropImageIfOrphan, insertImage, reserveItem, toItem, writable } from "@/db/items";
import { withDb } from "@/db";
import { items } from "@/db/schema";
import { currentOwner } from "@/lib/session";
import type { Item, Owner, Space } from "@/lib/types";

/*
 * Todas las escrituras pasan por el servidor: aquí se valida la sesión y quién puede escribir dónde
 * (antes lo hacía la RLS de Supabase). Los CHECK de la base validan los valores.
 * Se corre en el runtime Node.js (necesario para `ws` con cabeceras de Cloudflare Access).
 */

const SPACES: Space[] = ["cris", "melck", "shared"];
const MAX_IMAGE = 3_000_000;

const LAYOUT_KEYS = ["x", "y", "scale", "rotation", "z"] as const;
const FIELD_KEYS = [
  "category", "name", "description", "price", "currency", "url", "needs_locker", "kind", "status",
  "rotation", "style", "paper", "ink", "holder", "holder_color", "bg", "emoji", "code",
] as const;

/** Nombre de columna de la API (snake_case) → propiedad de Drizzle. */
const PROP: Record<string, keyof typeof items.$inferInsert> = {
  needs_locker: "needsLocker",
  holder_color: "holderColor",
};

function pick(src: Record<string, unknown>, keys: readonly string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in src) out[PROP[k] ?? k] = src[k];
  return out as Partial<typeof items.$inferInsert>;
}

/** Exige sesión válida; lanza si no la hay. */
async function requireOwner(): Promise<Owner> {
  const owner = await currentOwner();
  if (!owner) throw new Error("Inicia sesión para hacer cambios");
  return owner;
}

/** Valida y guarda la foto recibida (JPEG/PNG/WebP) devolviendo su id, o null si no hay foto. */
async function saveImage(db: Parameters<Parameters<typeof withDb>[0]>[0], file: FormDataEntryValue | null) {
  if (!(file instanceof Blob) || file.size === 0) return null;
  if (file.size > MAX_IMAGE) throw new Error("La foto es demasiado grande");
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("La foto debe ser JPG, PNG o WebP");
  return insertImage(db, Buffer.from(await file.arrayBuffer()), file.type);
}

/**
 * Crea un artículo en `space` con su posición y, si viene, su foto.
 * FormData: `data` (JSON con los campos + x,y,scale,z + space) y `image` (archivo opcional).
 */
export async function createItemAction(form: FormData): Promise<Item> {
  const owner = await requireOwner();
  const data = JSON.parse(String(form.get("data") ?? "{}")) as Record<string, unknown>;
  const space = data.space as Space;
  if (!SPACES.includes(space) || (space !== "shared" && space !== owner)) throw new Error("No puedes pegar aquí");
  return withDb(async (db) => {
    const imageId = await saveImage(db, form.get("image"));
    const [row] = await db
      .insert(items)
      .values({ ...pick(data, [...FIELD_KEYS, ...LAYOUT_KEYS]), space, imageId, createdBy: owner } as typeof items.$inferInsert)
      .returning();
    return toItem(row);
  });
}

/**
 * Edita los campos de un artículo. FormData: `data` (JSON), `image` (foto nueva, opcional) y
 * `removeImage` ("1" para quitar la foto actual).
 */
export async function updateItemAction(id: string, form: FormData): Promise<Item> {
  const owner = await requireOwner();
  const data = JSON.parse(String(form.get("data") ?? "{}")) as Record<string, unknown>;
  return withDb(async (db) => {
    const [before] = await db.select({ imageId: items.imageId }).from(items).where(and(eq(items.id, id), writable(owner)));
    if (!before) throw new Error("No puedes editar este artículo");
    const patch = pick(data, FIELD_KEYS);
    const newImage = await saveImage(db, form.get("image"));
    if (newImage) patch.imageId = newImage;
    else if (form.get("removeImage") === "1") patch.imageId = null;
    const [row] = await db.update(items).set(patch).where(and(eq(items.id, id), writable(owner))).returning();
    if (!row) throw new Error("No puedes editar este artículo");
    if ("imageId" in patch) await dropImageIfOrphan(db, before.imageId);
    return toItem(row);
  });
}

/** Posición, tamaño, giro y apilado (lo que cambia al arrastrar o pellizcar). */
export async function layoutItemAction(id: string, patch: Record<string, unknown>) {
  const owner = await requireOwner();
  const clean = pick(patch, LAYOUT_KEYS);
  for (const v of Object.values(clean)) if (typeof v !== "number" || !Number.isFinite(v)) throw new Error("Posición inválida");
  await withDb((db) => db.update(items).set(clean).where(and(eq(items.id, id), writable(owner))));
}

/** Reposiciona varios artículos de una vez (acomodar en filas), una sola conexión. */
export async function layoutManyAction(list: { id: string; x: number; y: number }[]) {
  const owner = await requireOwner();
  for (const p of list) if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error("Posición inválida");
  await withDb(async (db) => {
    for (const p of list) await db.update(items).set({ x: p.x, y: p.y }).where(and(eq(items.id, p.id), writable(owner)));
  });
}

/** Cambia el estado de un artículo propio o compartido (pendiente, reservado, comprado). */
export async function setItemStatusAction(id: string, status: Item["status"]): Promise<Item> {
  const owner = await requireOwner();
  if (!["pending", "reserved", "bought"].includes(status)) throw new Error("Estado inválido");
  return withDb(async (db) => {
    const [row] = await db.update(items).set({ status }).where(and(eq(items.id, id), writable(owner))).returning();
    if (!row) throw new Error("No puedes cambiar este artículo");
    return toItem(row);
  });
}

/** Reserva (o libera) un regalo del tablero ajeno; no guarda quién reservó. */
export async function reserveItemAction(id: string, reserve: boolean): Promise<Item> {
  const owner = await requireOwner();
  const row = await withDb((db) => reserveItem(db, id, reserve, owner));
  if (!row) throw new Error("El estado ya cambió; recarga el tablero");
  return row;
}

/** Borra un artículo propio o compartido y su foto. */
export async function deleteItemAction(id: string) {
  const owner = await requireOwner();
  await withDb(async (db) => {
    const [row] = await db.delete(items).where(and(eq(items.id, id), writable(owner))).returning({ imageId: items.imageId });
    if (row) await dropImageIfOrphan(db, row.imageId);
  });
}
