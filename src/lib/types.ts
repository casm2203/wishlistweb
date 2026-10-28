export type Owner = "cris" | "melck";
export type Space = Owner | "shared";
export type ItemKind = "want" | "buy" | "gift";
export type ItemStatus = "pending" | "reserved" | "bought";
/** Define el fondo de la tarjeta: polaroid, ticket de cine o boarding pass. */
export type ItemCategory = "articulo" | "cine" | "viaje";

export interface Item {
  id: string;
  space: Space;
  category: ItemCategory;
  name: string;
  description: string;
  price: number | null;
  currency: string;
  url: string | null;
  image_url: string | null;
  needs_locker: boolean;
  kind: ItemKind;
  status: ItemStatus;
  x: number;
  y: number;
  rotation: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Lo que captura el formulario; la posición la decide el tablero. */
export interface ItemDraft {
  category: ItemCategory;
  name: string;
  description: string;
  price: number | null;
  currency: string;
  url: string | null;
  needs_locker: boolean;
  kind: ItemKind;
  status: ItemStatus;
  /** Foto nueva ya redimensionada (null = no cambia). */
  image: Blob | null;
  removeImage: boolean;
}
