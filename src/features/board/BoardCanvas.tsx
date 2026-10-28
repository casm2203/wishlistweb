"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type ReactNode,
  type Ref,
} from "react";
import { BANNER, BOARD_H, BOARD_W } from "./placement";

/** Con más zoom se ampliarían el corcho, los tickets y los pins por encima de su resolución real. */
const MAX_K = 1.25;
/** Por debajo de este zoom las tarjetas se ven "de lejos": sin texto. */
export const TEXT_ZOOM = 0.6;

export interface BoardApi {
  /** Centro de la vista en coordenadas del tablero. */
  center(): { x: number; y: number };
  /** Encuadra el tablero completo con su marco. */
  fit(): void;
  zoomBy(factor: number): void;
}

export const ScaleContext = createContext<() => number>(() => 1);

interface Props {
  children: ReactNode;
  controlRef?: Ref<BoardApi>;
  onTextVisibleChange?: (visible: boolean) => void;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Tablero fijo (con marco) que se puede acercar y mover; nunca se sale de la vista. */
export function BoardCanvas({ children, controlRef, onTextVisibleChange }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const view = useRef({ x: 0, y: 0, k: 1 });
  const minK = useRef(0.2);
  const atFit = useRef(true);
  const started = useRef(false);
  const textVisible = useRef<boolean | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  const apply = useCallback(() => {
    const root = rootRef.current;
    const world = worldRef.current;
    if (!root || !world) return;
    const v = view.current;
    const { width, height } = root.getBoundingClientRect();
    v.k = clamp(v.k, minK.current, MAX_K);
    // Si el tablero es más chico que la vista se centra; si no, no deja ver fuera de él.
    const sw = BOARD_W * v.k;
    const sh = BOARD_H * v.k;
    v.x = sw <= width ? (width - sw) / 2 : clamp(v.x, width - sw, 0);
    v.y = sh <= height ? (height - sh) / 2 : clamp(v.y, height - sh, 0);
    world.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.k})`;
    atFit.current = v.k <= minK.current * 1.001;
    const visible = v.k >= TEXT_ZOOM;
    if (visible !== textVisible.current) {
      textVisible.current = visible;
      onTextVisibleChange?.(visible);
    }
  }, [onTextVisibleChange]);

  const fit = useCallback(() => {
    view.current.k = minK.current;
    apply();
  }, [apply]);

  const zoomAt = useCallback(
    (cx: number, cy: number, factor: number) => {
      const v = view.current;
      const k = clamp(v.k * factor, minK.current, MAX_K);
      const ratio = k / v.k;
      v.x = cx - (cx - v.x) * ratio;
      v.y = cy - (cy - v.y) * ratio;
      v.k = k;
      apply();
    },
    [apply],
  );

  useImperativeHandle(
    controlRef,
    () => ({
      center() {
        const r = rootRef.current!.getBoundingClientRect();
        const { x, y, k } = view.current;
        return { x: (r.width / 2 - x) / k, y: (r.height / 2 - y) / k };
      },
      fit,
      zoomBy(factor) {
        const r = rootRef.current!.getBoundingClientRect();
        zoomAt(r.width / 2, r.height / 2, factor);
      },
    }),
    [fit, zoomAt],
  );

  // Encuadre inicial y al cambiar el tamaño de la ventana (si estaba "ver todo", se mantiene así).
  useEffect(() => {
    const root = rootRef.current!;
    const update = () => {
      const { width, height } = root.getBoundingClientRect();
      if (!width || !height) return;
      const wasFit = atFit.current;
      minK.current = Math.min(width / BOARD_W, height / BOARD_H);
      if (wasFit) view.current.k = minK.current;
      // En pantallas angostas "ver todo" deja las tarjetas diminutas: se arranca con zoom medio sobre el letrero.
      if (!started.current && width < 640) {
        const k = Math.max(minK.current, 0.36);
        view.current = { k, x: width / 2 - (BOARD_W / 2) * k, y: 60 - (BANNER.y - 24) * k };
      }
      started.current = true;
      apply();
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(root);
    return () => ro.disconnect();
  }, [apply]);

  // La rueda necesita listener no pasivo para poder bloquear el scroll de la página.
  useEffect(() => {
    const root = rootRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = root.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-e.deltaY * 0.01));
      } else {
        view.current.x -= e.deltaX;
        view.current.y -= e.deltaY;
        apply();
      }
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, [apply, zoomAt]);

  useEffect(() => {
    const zoomCenter = (f: number) => {
      const r = rootRef.current!.getBoundingClientRect();
      zoomAt(r.width / 2, r.height / 2, f);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select, [role=dialog]")) return;
      if (e.key === "+" || e.key === "=") zoomCenter(1.2);
      if (e.key === "-") zoomCenter(1 / 1.2);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomAt]);

  const getScale = useCallback(() => view.current.k, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const rect = rootRef.current!.getBoundingClientRect();
    const next = { x: e.clientX, y: e.clientY };
    if (pointers.current.size === 1) {
      view.current.x += next.x - prev.x;
      view.current.y += next.y - prev.y;
      apply();
    } else if (pointers.current.size === 2) {
      const other = [...pointers.current.entries()].find(([id]) => id !== e.pointerId)![1];
      const before = Math.hypot(prev.x - other.x, prev.y - other.y);
      const after = Math.hypot(next.x - other.x, next.y - other.y);
      const mid = { x: (next.x + other.x) / 2 - rect.left, y: (next.y + other.y) / 2 - rect.top };
      view.current.x += (next.x - prev.x) / 2;
      view.current.y += (next.y - prev.y) / 2;
      if (before > 0) zoomAt(mid.x, mid.y, after / before);
      else apply();
    }
    pointers.current.set(e.pointerId, next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
  };

  return (
    <ScaleContext.Provider value={getScale}>
      <div
        ref={rootRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="absolute inset-0 cursor-grab touch-none overflow-hidden bg-[#2a1c10] active:cursor-grabbing"
      >
        <div
          ref={worldRef}
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: BOARD_W, height: BOARD_H }}
        >
          {/* Imagen original sin recomprimir (next/image la reencodaría). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tablero-hd.jpg"
            alt=""
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full select-none"
          />
          {children}
        </div>
      </div>
    </ScaleContext.Provider>
  );
}
