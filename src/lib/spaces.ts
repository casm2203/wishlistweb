import type { ItemCategory, ItemKind, ItemStatus, Space } from "./types";

export const SPACES: Record<Space, { label: string; short: string; href: string; title: string; banner: string }> = {
  cris: { label: "Espacio Cris", short: "Cris", href: "/cris", title: "Cris", banner: "/avisos/aviso-cris.webp" },
  // El compartido reutiliza el letrero de Cris (corazones entrelazados).
  shared: { label: "Espacio compartido", short: "Compartido", href: "/", title: "Cris & Melck", banner: "/avisos/aviso-cris.webp" },
  melck: { label: "Espacio Melck", short: "Melck", href: "/melck", title: "Melck", banner: "/avisos/aviso-melck.webp" },
};

/** Orden de las pestañas: el compartido va en el centro. */
export const SPACE_ORDER: Space[] = ["cris", "shared", "melck"];

export const KINDS: Record<ItemKind, { label: string }> = {
  want: { label: "Lo quiero" },
  buy: { label: "Por comprar" },
  gift: { label: "Para regalar" },
};

const PINS = ["red", "green", "pink", "blue", "black", "cyan", "yellow", "mint", "purple"].map(
  (c) => `/pins/pin-${c}.png`,
);

/** Color de pin "aleatorio" pero estable: sale del id, así no cambia entre renders ni entre usuarios. */
export function pinFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0;
  return PINS[h % PINS.length];
}

interface Ticket {
  src: string;
  /** Zona imprimible del ticket, como fracción de su imagen. */
  content: { l: number; t: number; w: number; h: number };
  /** Relación de aspecto de la foto dentro del ticket (ancho / alto). */
  photoRatio: number;
}

interface CategoryMeta {
  label: string;
  /** Tamaño en unidades del tablero. */
  w: number;
  h: number;
  /** Sujetador: pin de color (según el tipo de intención) o ganchito. */
  holder: "pin" | "clip";
  /** null = polaroid. */
  ticket: Ticket | null;
  namePlaceholder: string;
}

// Los tickets son recortes de 388×206 (cine) y 722×307 (viaje): se muestran a ≤1:1
// con el zoom máximo del tablero para no perder nitidez.
export const CATEGORIES: Record<ItemCategory, CategoryMeta> = {
  articulo: {
    label: "Artículo",
    w: 220,
    h: 268,
    holder: "pin",
    ticket: null,
    namePlaceholder: "Nombre del artículo",
  },
  cine: {
    label: "Cine",
    w: 340,
    h: 180,
    holder: "pin",
    ticket: { src: "/tickets/cine.png", content: { l: 0.27, t: 0.12, w: 0.68, h: 0.76 }, photoRatio: 3 / 4 },
    namePlaceholder: "Película o función",
  },
  viaje: {
    label: "Viaje",
    w: 420,
    h: 179,
    holder: "clip",
    ticket: { src: "/tickets/viaje.png", content: { l: 0.05, t: 0.19, w: 0.65, h: 0.55 }, photoRatio: 4 / 3 },
    namePlaceholder: "Destino",
  },
};

export const CATEGORY_ORDER: ItemCategory[] = ["articulo", "cine", "viaje"];

export const STATUSES: Record<ItemStatus, string> = {
  pending: "Pendiente",
  reserved: "Reservado",
  bought: "Comprado",
};

export const CURRENCIES = ["USD", "EUR", "COP", "MXN"] as const;
