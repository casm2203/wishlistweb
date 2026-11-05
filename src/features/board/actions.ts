"use server";

import { createClient } from "@/lib/supabase/server";
import type { Item } from "@/lib/types";

/*
 * Escrituras de `items` que hacen UPDATE. Van por el servidor (con la sesión de las cookies) porque
 * el navegador no puede enviar PATCH a Supabase desde este origen (el preflight CORS falla) y
 * supabase-js usa PATCH para `.update()`. RLS sigue decidiendo quién puede escribir qué.
 */

const LAYOUT_KEYS = ["x", "y", "scale", "rotation", "z"] as const;
const FIELD_KEYS = [
  "category", "name", "description", "price", "currency", "url", "needs_locker", "kind", "status",
  "rotation", "style", "paper", "ink", "holder", "holder_color", "bg", "emoji", "code", "image_url",
] as const;

function pick<K extends string>(src: Record<string, unknown>, keys: readonly K[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in src) out[k] = src[k];
  return out;
}

export async function layoutItemAction(id: string, patch: Record<string, unknown>) {
  const clean = pick(patch, LAYOUT_KEYS);
  for (const v of Object.values(clean)) if (typeof v !== "number" || !Number.isFinite(v)) throw new Error("Posición inválida");
  const { error } = await (await createClient()).from("items").update(clean).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateItemAction(id: string, fields: Record<string, unknown>): Promise<Item> {
  const { data, error } = await (await createClient())
    .from("items")
    .update(pick(fields, FIELD_KEYS))
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as Item;
}

export async function setItemStatusAction(id: string, status: Item["status"]): Promise<Item> {
  if (!["pending", "reserved", "bought"].includes(status)) throw new Error("Estado inválido");
  const { data, error } = await (await createClient()).from("items").update({ status }).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data as Item;
}
