import { CATEGORIES } from "@/lib/spaces";
import type { Item, ItemCategory } from "@/lib/types";

/** Misma proporción que `tablero-hd.jpg` (1536×1024). Con el zoom máximo el corcho se amplía ≤2× respecto a la foto. */
export const BOARD_W = 2400;
export const BOARD_H = 1600;

/** Zona de corcho útil (dentro del marco de madera de la imagen), como fracción del tablero. */
const PLAY = { l: 0.032, r: 0.968, t: 0.065, b: 0.95 };

/** Letrero con el nombre del espacio, arriba al centro (alto máximo de los dos recortes). */
export const BANNER = { w: 960, h: 246, x: (BOARD_W - 960) / 2, y: 64 };

const GAP = 50;
const STEP = 60;

export const sizeOf = (category: ItemCategory) => CATEGORIES[category];

/** Mantiene la tarjeta dentro del corcho. */
export function clampToBoard(category: ItemCategory, x: number, y: number) {
  const { w, h } = sizeOf(category);
  return {
    x: Math.min(Math.max(x, BOARD_W * PLAY.l), BOARD_W * PLAY.r - w),
    y: Math.min(Math.max(y, BOARD_H * PLAY.t), BOARD_H * PLAY.b - h),
  };
}

export function clampItem(item: Item): Item {
  const { x, y } = clampToBoard(item.category, item.x, item.y);
  return x === item.x && y === item.y ? item : { ...item, x, y };
}

function overlaps(items: Item[], category: ItemCategory, x: number, y: number) {
  const { w, h } = sizeOf(category);
  const onBanner =
    x < BANNER.x + BANNER.w + GAP && x + w + GAP > BANNER.x && y < BANNER.y + BANNER.h + GAP && y + h + GAP > BANNER.y;
  if (onBanner) return true;
  return items.some((i) => {
    const o = sizeOf(i.category);
    return x < i.x + o.w + GAP && x + w + GAP > i.x && y < i.y + o.h + GAP && y + h + GAP > i.y;
  });
}

/** Busca en espiral, desde el centro de la vista, el primer hueco libre dentro del corcho. */
export function findFreeSpot(items: Item[], category: ItemCategory, cx: number, cy: number) {
  const { w, h } = sizeOf(category);
  const start = clampToBoard(category, cx - w / 2, cy - h / 2);
  for (let ring = 0; ring < 60; ring++) {
    for (let dy = -ring; dy <= ring; dy++) {
      for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const x = start.x + dx * STEP;
        const y = start.y + dy * STEP;
        const c = clampToBoard(category, x, y);
        if (c.x !== x || c.y !== y) continue; // fuera del corcho
        if (!overlaps(items, category, x, y)) return jitter(category, x, y);
      }
    }
  }
  return jitter(category, start.x, start.y);
}

function jitter(category: ItemCategory, x: number, y: number) {
  const j = clampToBoard(category, x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20);
  return {
    x: Math.round(j.x),
    y: Math.round(j.y),
    rotation: Math.round((Math.random() - 0.5) * 8 * 10) / 10,
  };
}
