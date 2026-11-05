import { STYLES, styleOf } from "@/lib/spaces";
import type { Item } from "@/lib/types";

/** Ancho lógico del corcho; se escala para encajar en pantalla (ver BoardStage). */
export const WORLD_W = 1200;
/** Alto mínimo del corcho: con el letrero de arriba, el tablero completo es 19:10 (ver `.board`). */
/** Todas las tarjetas se dibujan al 90 % de su tamaño base (se multiplica por la escala de cada una). */
export const CARD_K = 0.9;
const MIN_H = 440;
/** Margen superior: los pines, cintas y clips sobresalen por encima de la tarjeta. */
const MIN_Y = 40;

/** Lo mínimo de una tarjeta para colocarla: su categoría, estilo y escala determinan el tamaño. */
type Shape = Pick<Item, "category" | "style" | "scale">;
type Placed = Shape & Pick<Item, "x" | "y">;

/** Lo que ocupa la tarjeta en pantalla: la escala se aplica desde su centro, así que se sale de (x, y) por igual a los lados. */
function box(shape: Shape, x: number, y: number) {
  const b = STYLES[styleOf(shape)];
  const k = shape.scale * CARD_K;
  return { l: x - (b.w * (k - 1)) / 2, t: y - (b.h * (k - 1)) / 2, w: b.w * k, h: b.h * k };
}

/** Alto del corcho: lo que ocupan las tarjetas más un margen para seguir pegando abajo. */
export function worldHeight(items: Placed[]) {
  const bottom = items.reduce((m, i) => {
    const b = box(i, i.x, i.y);
    return Math.max(m, b.t + b.h);
  }, 0);
  return Math.max(MIN_H, Math.round(bottom + 20));
}

/** Acomoda las tarjetas en filas de izquierda a derecha (por categoría y fecha); devuelve la nueva posición de cada una. */
export function packRows(items: Item[]): Map<string, { x: number; y: number }> {
  const order = ["articulo", "cine", "viaje", "nota"];
  const sorted = [...items].sort(
    (a, b) => order.indexOf(a.category) - order.indexOf(b.category) || a.created_at.localeCompare(b.created_at),
  );
  const GAP = 40;
  const out = new Map<string, { x: number; y: number }>();
  let cx = 60;
  let cy = MIN_Y + 20;
  let rowH = 0;
  for (const it of sorted) {
    const b = box(it, 0, 0);
    if (cx + b.w > WORLD_W - 60 && cx > 60) {
      cx = 60;
      cy += rowH + GAP;
      rowH = 0;
    }
    // (x, y) es la esquina sin escalar: la escala se aplica desde el centro.
    out.set(it.id, { x: Math.round(cx - b.l), y: Math.round(cy - b.t) });
    cx += b.w + GAP;
    rowH = Math.max(rowH, b.h);
  }
  return out;
}

/** Mantiene la tarjeta dentro del ancho del corcho (hacia abajo no hay límite). */
export function clampToBoard(shape: Shape, x: number, y: number) {
  const b = STYLES[styleOf(shape)];
  const k = shape.scale * CARD_K;
  const d = (b.w * (k - 1)) / 2;
  const minX = d;
  const maxX = Math.max(minX, WORLD_W - b.w - d);
  return { x: Math.min(Math.max(x, minX), maxX), y: Math.max(y, MIN_Y + (b.h * (k - 1)) / 2) };
}

export function clampItem(item: Item): Item {
  const { x, y } = clampToBoard(item, item.x, item.y);
  return x === item.x && y === item.y ? item : { ...item, x, y };
}
