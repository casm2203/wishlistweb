import type { CardStyle, HolderKind, Item, ItemCategory, ItemKind, ItemStatus, Space } from "./types";

export const SPACES: Record<
  Space,
  { label: string; short: string; href: string; title: string; sub: string; tab: string; sign: string }
> = {
  cris: { label: "Espacio Cris", short: "Cris", href: "/cris", title: "Cris", sub: "lo que le gustaría a Cris", tab: "c", sign: "CRIS" },
  shared: { label: "Espacio compartido", short: "Compartido", href: "/", title: "Cris & Melck", sub: "lo que queremos juntos ♡", tab: "s", sign: "CRIS & MELCK" },
  melck: { label: "Espacio Melck", short: "Melck", href: "/melck", title: "Melck", sub: "cosas que me harían feliz ✿", tab: "", sign: "MELCK" },
};

/** Orden de las pestañas: el compartido va en el centro. */
export const SPACE_ORDER: Space[] = ["cris", "shared", "melck"];

export const KINDS: Record<ItemKind, { label: string; color: string }> = {
  want: { label: "Lo quiero", color: "#ff8fa3" },
  buy: { label: "Por comprar", color: "#f6d77a" },
  gift: { label: "Para regalar", color: "#9fd8bd" },
};

/** Hash estable del id: de él salen el color del pin/cinta y otros detalles "aleatorios" pero fijos. */
export function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Colores por defecto (salen del hash del id) y paletas para elegir. */
export const PIN_COLORS = ["#e2463c", "#3aa7a0", "#2f6fd6", "#f2a43a", "#d64fa0"];
export const TAPE_COLORS = ["#b9dfd2", "#f6c9d3", "#f6e08f", "#c8d6f2"];

export const HOLDERS: Record<Exclude<HolderKind, "none">, { label: string; colors: string[] }> = {
  pin: { label: "📌 Pin", colors: ["#e2463c", "#3aa7a0", "#2f6fd6", "#f2a43a", "#d64fa0", "#f2c94c", "#8e5bd6", "#2d211a"] },
  tape: { label: "🎞 Cinta", colors: ["#b9dfd2", "#f6c9d3", "#f6e08f", "#c8d6f2", "#e8d9c4", "#d9c8f0"] },
  clip: { label: "📎 Clip", colors: ["#9fa3a9", "#d4a24c", "#e88fb0", "#6fa8dc", "#2d211a"] },
};

export const INKS = ["#2d211a", "#ffffff", "#b8322a", "#1d2f5c", "#2f4a3a", "#7a2b3c", "#d64fa0"];
export const BG_COLORS = ["#f3e6f0", "#e3f0e6", "#e6eef8", "#fbeccf", "#f7d9d4", "#9b1c22", "#9fd0e6", "#fff3a6"];
export const EMOJIS = ["🎧", "📷", "👟", "💄", "📚", "🧸", "🌸", "🏹", "🎬", "🍿", "🎞️", "🏖️", "🏰", "🗼", "🎆", "⛰️", "🐶", "☕", "🎮", "💍", "👗", "🌷", "🎀", "🧳"];

interface StyleMeta {
  label: string;
  /** Tamaño aproximado en unidades del tablero (para colocar sin solapar y no salirse). */
  w: number;
  h: number;
  /** Sujetador por defecto. */
  holder: HolderKind;
  /** Papeles sugeridos; el primero es el de por defecto. */
  papers: string[];
}

export const STYLES: Record<CardStyle, StyleMeta> = {
  polaroid: { label: "Polaroid", w: 170, h: 226, holder: "tape", papers: ["#fffdf8", "#f6efe0", "#fbe3ea", "#e3eef8", "#2d211a"] },
  estampilla: { label: "Estampita", w: 176, h: 228, holder: "pin", papers: ["#f1e8d4", "#ffffff", "#f6d6dc", "#dbe6f1", "#e6ece2"] },
  recibo: { label: "Recibo", w: 206, h: 326, holder: "clip", papers: ["#fbfaf6", "#f6efe0", "#fbe9ef", "#eef5fb", "#fff8d6"] },
  boleta: { label: "Boleta", w: 176, h: 352, holder: "pin", papers: ["#111111", "#5a1420", "#1d2f5c", "#2f4a3a", "#f59ba7", "#f3e9d2"] },
  pelicula: { label: "Tira de película", w: 156, h: 388, holder: "tape", papers: ["#111111", "#3a2418", "#5a1420", "#1d2f5c"] },
  correo: { label: "Correo aéreo", w: 184, h: 360, holder: "pin", papers: ["#1d5aa6", "#e3342f", "#2f4a3a", "#d64fa0", "#111111"] },
  postit: { label: "Post-it doble", w: 178, h: 178, holder: "pin", papers: ["#fff3a6", "#f4a3bf", "#c9b3e6", "#a8dcc0", "#a9d3e8", "#ffc89a", "#f6efe0"] },
  cuaderno: { label: "Hoja de cuaderno", w: 184, h: 220, holder: "pin", papers: ["#ffffff", "#fdf6e3", "#fbe9ef", "#eef5fb"] },
  clasica: { label: "Notita clásica", w: 172, h: 150, holder: "clip", papers: ["#fff3a6", "#f4a3bf", "#c9b3e6", "#a8dcc0", "#a9d3e8", "#ffc89a"] },
  ficha: { label: "Ficha rayada", w: 200, h: 132, holder: "tape", papers: ["#e05a5a", "#5a8fe0", "#4cbf6a", "#d64fa0", "#f2a43a"] },
};

interface CategoryMeta {
  label: string;
  /** Estilos disponibles; el primero es el de por defecto. */
  styles: CardStyle[];
  /** Icono para etiquetas ("🛍️ Producto"). */
  icon: string;
  /** Fondo de la foto y emoji de respaldo por defecto. */
  bg: string;
  emoji: string;
  namePlaceholder: string;
  /** Si lleva foto, precio y enlace (las notas son solo texto). */
  photo: boolean;
}

export const CATEGORIES: Record<ItemCategory, CategoryMeta> = {
  articulo: { label: "Artículo", icon: "🛍️", styles: ["polaroid", "estampilla", "recibo"], bg: "#e6eef8", emoji: "🎁", namePlaceholder: "Nombre del artículo", photo: true },
  cine: { label: "Cine", icon: "🎬", styles: ["boleta", "pelicula"], bg: "#b3202a", emoji: "🎬", namePlaceholder: "Película o función", photo: true },
  viaje: { label: "Viaje", icon: "✈️", styles: ["correo"], bg: "#ffffff", emoji: "✈️", namePlaceholder: "Destino", photo: false },
  nota: { label: "Nota", icon: "📝", styles: ["postit", "cuaderno", "clasica", "ficha"], bg: "#fff3a6", emoji: "📝", namePlaceholder: "Título de la nota", photo: false },
};

type Look = Pick<Item, "category" | "style" | "paper" | "ink" | "holder" | "holder_color" | "bg" | "emoji" | "id" | "scale">;

/** Estilo efectivo: el elegido si pertenece a la categoría; si no, el primero de la categoría. */
export function styleOf(item: Pick<Item, "category" | "style">): CardStyle {
  const { styles } = CATEGORIES[item.category];
  return item.style && styles.includes(item.style) ? item.style : styles[0];
}

/** Tamaño en el tablero, con la escala de la tarjeta aplicada. */
export function sizeOf(item: Pick<Item, "category" | "style" | "scale">) {
  const m = STYLES[styleOf(item)];
  return { w: m.w * item.scale, h: m.h * item.scale };
}

export function paperOf(item: Look): string {
  return item.paper ?? STYLES[styleOf(item)].papers[0];
}

export function holderOf(item: Look): { kind: HolderKind; color: string } {
  const kind = item.holder ?? STYLES[styleOf(item)].holder;
  if (kind === "none") return { kind, color: "" };
  const h = hashId(item.id);
  const fallback = kind === "pin" ? PIN_COLORS[h % PIN_COLORS.length] : kind === "tape" ? TAPE_COLORS[h % TAPE_COLORS.length] : HOLDERS.clip.colors[0];
  return { kind, color: item.holder_color ?? fallback };
}

export const CATEGORY_ORDER: ItemCategory[] = ["articulo", "cine", "viaje", "nota"];

export const STATUSES: Record<ItemStatus, string> = {
  pending: "Pendiente",
  reserved: "Reservado",
  bought: "Comprado",
};

export const CURRENCIES = ["USD", "EUR", "COP", "MXN"] as const;

/** Precio con símbolo de moneda (cae a «valor MONEDA» si la moneda no es ISO). */
export function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat("es", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}
