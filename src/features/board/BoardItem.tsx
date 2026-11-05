"use client";

import { memo, useContext, useEffect, useRef } from "react";
import { STYLES, styleOf } from "@/lib/spaces";
import type { Item } from "@/lib/types";
import { Card } from "./cards";
import { ScaleContext } from "./BoardStage";
import { CARD_K, clampToBoard } from "./placement";

export const MIN_SCALE = 0.5;
export const MAX_SCALE = 2.2;
export const MAX_TILT = 45;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface Props {
  item: Item;
  canEdit: boolean;
  /** Vista pública: los sellos se leen desde fuera ("YA RESERVADO"). */
  visitor: boolean;
  lifted: boolean;
  /** Tarjeta provisional de la bandeja (aún sin guardar). */
  tmp?: boolean;
  onOpen: (id: string) => void;
  onDragStart: (id: string) => void;
  /** Cambio en vivo (se está arrastrando o pellizcando). */
  onChange: (id: string, patch: Partial<Pick<Item, "x" | "y" | "scale" | "rotation">>) => void;
  /** Gesto terminado: hay que guardar. */
  onCommit: (id: string) => void;
}

interface DragState {
  px: number;
  py: number;
  ox: number;
  oy: number;
  dragged: boolean;
}

interface PinchState {
  d0: number;
  a0: number;
  s0: number;
  r0: number;
}

const angle = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

/** Posición de una tarjeta sobre el corcho. Edición: arrastrar, pellizcar (tamaño + giro), Ctrl+rueda (tamaño), Shift+rueda (giro). */
export const BoardItem = memo(function BoardItem({
  item,
  canEdit,
  visitor,
  lifted,
  tmp = false,
  onOpen,
  onDragStart,
  onChange,
  onCommit,
}: Props) {
  const getScale = useContext(ScaleContext);
  const ref = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<DragState | null>(null);
  const pinch = useRef<PinchState | null>(null);
  const wheelTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Lo último que vio la tarjeta, para que los gestos no trabajen con valores viejos.
  const live = useRef(item);
  useEffect(() => {
    live.current = item;
  });

  const { w } = STYLES[styleOf(item)];

  // Ctrl+rueda = tamaño, Shift+rueda = giro. Necesita listener no pasivo para frenar el zoom/scroll del navegador.
  useEffect(() => {
    const el = ref.current;
    if (!el || !canEdit) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.shiftKey) return;
      e.preventDefault();
      const cur = live.current;
      if (e.ctrlKey) {
        const scale = clamp(Math.round(cur.scale * (1 - e.deltaY * 0.01) * 100) / 100, MIN_SCALE, MAX_SCALE);
        onChange(cur.id, { scale });
      } else {
        const d = (e.deltaY || e.deltaX) > 0 ? 2 : -2;
        onChange(cur.id, { rotation: clamp(Math.round((cur.rotation + d) * 10) / 10, -MAX_TILT, MAX_TILT) });
      }
      clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => onCommit(cur.id), 400);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      clearTimeout(wheelTimer.current);
    };
  }, [canEdit, onChange, onCommit]);

  const startPinch = () => {
    const [a, b] = [...pointers.current.values()];
    pinch.current = { d0: Math.hypot(b.x - a.x, b.y - a.y) || 1, a0: angle(a, b), s0: live.current.scale, r0: live.current.rotation };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (canEdit && pointers.current.size === 2 && drag.current) {
      startPinch();
      drag.current.dragged = true;
      return;
    }
    if (pointers.current.size === 1) {
      const cur = live.current;
      drag.current = { px: e.clientX, py: e.clientY, ox: cur.x, oy: cur.y, dragged: false };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinch.current && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const p = pinch.current;
      let da = angle(a, b) - p.a0;
      if (da > 180) da -= 360;
      if (da < -180) da += 360;
      onChange(live.current.id, {
        scale: clamp(Math.round(p.s0 * (Math.hypot(b.x - a.x, b.y - a.y) / p.d0) * 100) / 100, MIN_SCALE, MAX_SCALE),
        rotation: clamp(Math.round((p.r0 + da) * 10) / 10, -MAX_TILT, MAX_TILT),
      });
      return;
    }

    const d = drag.current;
    if (!d || pinch.current) return;
    const k = getScale();
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!d.dragged) {
      if (Math.hypot(dx, dy) < 5) return;
      d.dragged = true;
      if (canEdit) onDragStart(live.current.id);
    }
    if (!canEdit) return;
    const p = clampToBoard(live.current, d.ox + dx / k, d.oy + dy / k);
    onChange(live.current.id, { x: Math.round(p.x), y: Math.round(p.y) });
  };

  const release = (e: React.PointerEvent, cancelled: boolean) => {
    pointers.current.delete(e.pointerId);
    if (pinch.current) {
      // Al soltar un dedo termina el pellizco; el otro dedo no arrastra la tarjeta.
      if (pointers.current.size < 2) {
        pinch.current = null;
        onCommit(live.current.id);
      }
      if (pointers.current.size === 0) drag.current = null;
      return;
    }
    if (pointers.current.size > 0) return;
    const d = drag.current;
    drag.current = null;
    if (!d || cancelled) return;
    if (!d.dragged) onOpen(live.current.id);
    else if (canEdit) onCommit(live.current.id);
  };

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => release(e, false)}
      onPointerCancel={(e) => release(e, true)}
      className={`slot${canEdit ? " edit" : ""}${lifted ? " drag" : ""}${tmp ? " tmp" : ""}`}
      style={{ left: item.x, top: item.y, width: w, zIndex: item.z, "--s": item.scale * CARD_K } as React.CSSProperties}
    >
      <Card item={item} visitor={visitor} />
    </div>
  );
});
