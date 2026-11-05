export type Owner = "cris" | "melck";
export type Space = Owner | "shared";
export type ItemKind = "want" | "buy" | "gift";
export type ItemStatus = "pending" | "reserved" | "bought";
/** Tipo de tarjeta: artículo, cine, viaje o nota suelta. */
export type ItemCategory = "articulo" | "cine" | "viaje" | "nota";
/** Diseño de la tarjeta; cada categoría ofrece los suyos (ver STYLES en spaces.ts). */
export type CardStyle =
  | "polaroid"
  | "estampilla"
  | "boleta"
  | "pelicula"
  | "correo"
  | "postit"
  | "cuaderno"
  | "clasica"
  | "ficha";
/** Sujetador de la tarjeta al corcho. */
export type HolderKind = "pin" | "tape" | "clip" | "none";

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
  /** Personalización: null = valor por defecto de la categoría/estilo. */
  style: CardStyle | null;
  paper: string | null;
  ink: string | null;
  holder: HolderKind | null;
  holder_color: string | null;
  bg: string | null;
  emoji: string | null;
  code: string | null;
  scale: number;
  z: number;
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
  rotation: number;
  style: CardStyle | null;
  paper: string | null;
  ink: string | null;
  holder: HolderKind | null;
  holder_color: string | null;
  bg: string | null;
  emoji: string | null;
  code: string | null;
  /** Foto nueva ya redimensionada (null = no cambia). */
  image: Blob | null;
  removeImage: boolean;
}
