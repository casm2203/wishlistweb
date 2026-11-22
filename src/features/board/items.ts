import type { Item, ItemDraft, Space } from "@/lib/types";
import {
  createItemAction,
  deleteItemAction,
  layoutItemAction,
  layoutManyAction,
  reserveItemAction,
  setItemStatusAction,
  updateItemAction,
} from "./actions";

/** Campos editables del formulario (sin la foto), tal como los espera la acción del servidor. */
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

/** Arma el FormData (JSON + foto opcional) que viaja a la acción del servidor. */
function body(data: object, image: Blob | null, removeImage = false) {
  const form = new FormData();
  form.set("data", JSON.stringify(data));
  if (image) form.set("image", image, "foto.jpg");
  if (removeImage) form.set("removeImage", "1");
  return form;
}

export async function createItem(
  space: Space,
  draft: ItemDraft,
  pos: { x: number; y: number; scale: number; z: number },
): Promise<Item> {
  return createItemAction(body({ ...fields(draft), ...pos, space }, draft.image));
}

export async function updateItem(item: Item, draft: ItemDraft): Promise<Item> {
  return updateItemAction(item.id, body(fields(draft), draft.image, !draft.image && draft.removeImage));
}

/** Posición, tamaño, giro y orden de apilado: lo que cambia al arrastrar o pellizcar una tarjeta. */
export type Layout = Pick<Item, "x" | "y" | "scale" | "rotation" | "z">;

export async function layoutItem(id: string, patch: Partial<Layout>) {
  await layoutItemAction(id, patch);
}

/** Guarda las posiciones de muchas tarjetas en una sola petición. */
export async function layoutMany(list: { id: string; x: number; y: number }[]) {
  await layoutManyAction(list);
}

export async function setItemStatus(id: string, status: Item["status"]): Promise<Item> {
  return setItemStatusAction(id, status);
}

/** Reserva (o libera) un regalo del tablero ajeno; el servidor valida sesión, espacio y estado. */
export async function reserveItem(id: string, reserve: boolean): Promise<Item> {
  return reserveItemAction(id, reserve);
}

export async function deleteItem(id: string) {
  await deleteItemAction(id);
}
