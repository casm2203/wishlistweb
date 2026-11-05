import { createClient } from "@/lib/supabase/client";
import type { Item, ItemDraft, Space } from "@/lib/types";
import { layoutItemAction, setItemStatusAction, updateItemAction } from "./actions";

const BUCKET = "item-images";

async function uploadImage(blob: Blob): Promise<string> {
  const supabase = createClient();
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function fields(draft: ItemDraft) {
  return {
    category: draft.category,
    name: draft.name,
    description: draft.description,
    price: draft.price,
    currency: draft.currency,
    url: draft.url,
    needs_locker: draft.needs_locker,
    kind: draft.kind,
    status: draft.status,
    rotation: draft.rotation,
    style: draft.style,
    paper: draft.paper,
    ink: draft.ink,
    holder: draft.holder,
    holder_color: draft.holder_color,
    bg: draft.bg,
    emoji: draft.emoji,
    code: draft.code,
  };
}

export async function createItem(
  space: Space,
  draft: ItemDraft,
  pos: { x: number; y: number; scale: number; z: number },
): Promise<Item> {
  const supabase = createClient();
  const image_url = draft.image ? await uploadImage(draft.image) : null;
  const { data, error } = await supabase
    .from("items")
    .insert({ ...fields(draft), ...pos, space, image_url })
    .select()
    .single();
  if (error) throw error;
  return data as Item;
}

export async function updateItem(item: Item, draft: ItemDraft): Promise<Item> {
  let image_url = item.image_url;
  if (draft.image) image_url = await uploadImage(draft.image);
  else if (draft.removeImage) image_url = null;
  return updateItemAction(item.id, { ...fields(draft), image_url });
}

/** Posición, tamaño, giro y orden de apilado: lo que cambia al arrastrar o pellizcar una tarjeta. */
export type Layout = Pick<Item, "x" | "y" | "scale" | "rotation" | "z">;

export async function layoutItem(id: string, patch: Partial<Layout>) {
  await layoutItemAction(id, patch);
}

export async function setItemStatus(id: string, status: Item["status"]): Promise<Item> {
  return setItemStatusAction(id, status);
}

/** Reserva (o libera) un regalo del tablero ajeno; la función SQL valida sesión, espacio y estado. */
export async function reserveItem(id: string, reserve: boolean): Promise<Item> {
  const { data, error } = await createClient().rpc("reserve_item", { item_id: id, reserve });
  if (error) throw error;
  return data as Item;
}

export async function deleteItem(id: string) {
  const { error } = await createClient().from("items").delete().eq("id", id);
  if (error) throw error;
}
