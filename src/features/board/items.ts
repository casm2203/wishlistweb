import { createClient } from "@/lib/supabase/client";
import type { Item, ItemDraft, Space } from "@/lib/types";

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
  };
}

export async function createItem(
  space: Space,
  draft: ItemDraft,
  pos: { x: number; y: number; rotation: number },
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
  const supabase = createClient();
  let image_url = item.image_url;
  if (draft.image) image_url = await uploadImage(draft.image);
  else if (draft.removeImage) image_url = null;
  const { data, error } = await supabase
    .from("items")
    .update({ ...fields(draft), image_url })
    .eq("id", item.id)
    .select()
    .single();
  if (error) throw error;
  return data as Item;
}

export async function moveItem(id: string, x: number, y: number) {
  const { error } = await createClient().from("items").update({ x, y }).eq("id", id);
  if (error) throw error;
}

export async function setItemStatus(id: string, status: Item["status"]): Promise<Item> {
  const { data, error } = await createClient()
    .from("items")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Item;
}

export async function deleteItem(id: string) {
  const { error } = await createClient().from("items").delete().eq("id", id);
  if (error) throw error;
}
