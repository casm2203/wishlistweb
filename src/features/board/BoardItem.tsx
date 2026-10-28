"use client";

import { memo, useContext, useRef } from "react";
import { CATEGORIES, pinFor } from "@/lib/spaces";
import type { Item } from "@/lib/types";
import { ScaleContext } from "./BoardCanvas";
import { clampToBoard } from "./placement";

interface Props {
  item: Item;
  showText: boolean;
  canEdit: boolean;
  lifted: boolean;
  onOpen: (id: string) => void;
  onDragStart: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onCommit: (id: string, x: number, y: number) => void;
}

interface DragState {
  px: number;
  py: number;
  ox: number;
  oy: number;
  dragged: boolean;
  x: number;
  y: number;
}

const shadow = (lifted: boolean) =>
  lifted ? "drop-shadow(0 18px 14px rgba(40,22,5,0.5))" : "drop-shadow(0 4px 4px rgba(40,22,5,0.4))";

function Badges({ item }: { item: Item }) {
  return (
    <div className="absolute bottom-1.5 right-1.5 flex gap-1 text-lg drop-shadow">
      {item.needs_locker && <span title="Requiere casillero">📦</span>}
      {item.status === "bought" && <span title="Comprado">✅</span>}
      {item.status === "reserved" && <span title="Reservado">🔖</span>}
    </div>
  );
}

function Photo({ item, className, ratio }: { item: Item; className: string; ratio?: number }) {
  return (
    <div className={`relative overflow-hidden bg-stone-200 ${className}`} style={ratio ? { aspectRatio: ratio } : undefined}>
      {item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- fotos de Supabase Storage, ya redimensionadas
        <img src={item.image_url} alt="" draggable={false} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-4xl text-stone-400">🎁</div>
      )}
      <Badges item={item} />
    </div>
  );
}

function Holder({ item }: { item: Item }) {
  const holder = CATEGORIES[item.category].holder;
  return holder === "clip" ? (
    // eslint-disable-next-line @next/next/no-img-element -- recorte local, no se reencodea
    <img
      src="/pins/clip.png"
      alt=""
      draggable={false}
      className="absolute -top-11 left-1/2 w-[84px] -translate-x-1/2"
      style={{ filter: "drop-shadow(0 3px 3px rgba(40,22,5,0.45))" }}
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element -- recorte local, no se reencodea
    <img
      src={pinFor(item.id)}
      alt=""
      draggable={false}
      className="absolute -top-9 left-1/2 w-[50px] -translate-x-[40%]"
      style={{ filter: "drop-shadow(0 3px 3px rgba(40,22,5,0.45))" }}
    />
  );
}

/** Tarjeta del tablero: polaroid, ticket de cine o boarding pass. De lejos solo foto; con zoom aparece el nombre. */
export const BoardItem = memo(function BoardItem({
  item,
  showText,
  canEdit,
  lifted,
  onOpen,
  onDragStart,
  onMove,
  onCommit,
}: Props) {
  const getScale = useContext(ScaleContext);
  const drag = useRef<DragState | null>(null);
  const meta = CATEGORIES[item.category];
  const ticket = meta.ticket;

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation(); // que no mueva el tablero
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, ox: item.x, oy: item.y, dragged: false, x: item.x, y: item.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const k = getScale();
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!d.dragged) {
      if (Math.hypot(dx, dy) < 5) return;
      d.dragged = true;
      if (canEdit) onDragStart(item.id);
    }
    if (!canEdit) return;
    const p = clampToBoard(item.category, d.ox + dx / k, d.oy + dy / k);
    d.x = p.x;
    d.y = p.y;
    onMove(item.id, d.x, d.y);
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.dragged) onOpen(item.id);
    else if (canEdit) onCommit(item.id, d.x, d.y);
  };

  const nameClass = ticket ? "line-clamp-3 text-left leading-6" : "truncate text-center";
  const name = (
    <p className={`font-hand text-2xl text-stone-800 transition-opacity ${nameClass} ${showText ? "opacity-100" : "opacity-0"}`}>
      {item.name}
    </p>
  );

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="absolute cursor-pointer touch-none select-none"
      style={{
        left: item.x,
        top: item.y,
        width: meta.w,
        height: meta.h,
        zIndex: lifted ? 50 : 1,
        transform: `rotate(${item.rotation}deg) scale(${lifted ? 1.05 : 1})`,
        transition: "transform 120ms",
      }}
    >
      {ticket ? (
        <div className="relative h-full w-full" style={{ filter: shadow(lifted) }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- recorte local, no se reencodea */}
          <img src={ticket.src} alt="" draggable={false} className="absolute inset-0 h-full w-full" />
          <div
            className="absolute flex items-center gap-3"
            style={{
              left: `${ticket.content.l * 100}%`,
              top: `${ticket.content.t * 100}%`,
              width: `${ticket.content.w * 100}%`,
              height: `${ticket.content.h * 100}%`,
            }}
          >
            <Photo item={item} ratio={ticket.photoRatio} className="h-full shrink-0" />
            <div className="min-w-0 flex-1">{name}</div>
          </div>
        </div>
      ) : (
        <div
          className="relative h-full w-full bg-[#fdfcf8] p-3 pb-0"
          style={{ filter: shadow(lifted) }}
        >
          <Photo item={item} className="h-[196px] w-[196px]" />
          <div className="mt-1 leading-[44px]">{name}</div>
        </div>
      )}
      <Holder item={item} />
    </div>
  );
});
